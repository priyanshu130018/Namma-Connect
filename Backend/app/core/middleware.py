from starlette.types import ASGIApp, Receive, Scope, Send
import json

class ResponseStandardizerMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        # Skip OpenAPI documentation pages, schemas, and static media routes
        if any(path.startswith(prefix) for prefix in ["/docs", "/openapi.json", "/redoc", "/media"]):
            await self.app(scope, receive, send)
            return

        response_body = []
        response_headers = []
        status_code = [200]
        is_streaming = [False]

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code[0] = message["status"]
                response_headers.extend(message["headers"])
            elif message["type"] == "http.response.body":
                if message.get("more_body", False):
                    # For safety, if it's a multi-chunk streaming response, pass start/body immediately
                    is_streaming[0] = True

                if is_streaming[0]:
                    if len(response_body) > 0:
                        # Flush any buffered body chunks before switching to streaming mode
                        await send({"type": "http.response.start", "status": status_code[0], "headers": response_headers})
                        await send({"type": "http.response.body", "body": b"".join(response_body), "more_body": True})
                        response_body.clear()
                    await send(message)
                    return

                response_body.append(message.get("body", b""))
                if not message.get("more_body", False):
                    headers_dict = {k.decode("latin1").lower(): v.decode("latin1") for k, v in response_headers}
                    content_type = headers_dict.get("content-type", "")
                    
                    if "application/json" in content_type:
                        try:
                            full_body = b"".join(response_body)
                            data = json.loads(full_body.decode("utf-8"))
                            
                            # Wrap JSON responses matching standard format requirements
                            # If it is already in standard format (has success, data, message), keep it
                            if isinstance(data, dict) and "success" in data and "data" in data and "message" in data:
                                pass
                            else:
                                standardized = {
                                    "success": True,
                                    "data": data,
                                    "message": "Operation successful"
                                }
                                if isinstance(data, dict):
                                    if "success" in data:
                                        standardized["success"] = data["success"]
                                    if "message" in data:
                                        standardized["message"] = data["message"]
                                    # Merge original dictionary keys at root level for backward compatibility with tests
                                    for k, v in data.items():
                                        if k not in ["success", "data", "message"]:
                                            standardized[k] = v
                                            
                                new_body = json.dumps(standardized).encode("utf-8")
                                # Adjust Content-Length header to match new payload size
                                new_headers = []
                                for k, v in response_headers:
                                    if k.lower() == b"content-length":
                                        new_headers.append((b"content-length", str(len(new_body)).encode("latin1")))
                                    else:
                                        new_headers.append((k, v))
                                response_headers.clear()
                                response_headers.extend(new_headers)
                                response_body.clear()
                                response_body.append(new_body)
                        except Exception:
                            pass
                    
                    # Complete response cycle
                    await send({"type": "http.response.start", "status": status_code[0], "headers": response_headers})
                    await send({"type": "http.response.body", "body": b"".join(response_body), "more_body": False})
                    return
            else:
                await send(message)

        await self.app(scope, receive, send_wrapper)
