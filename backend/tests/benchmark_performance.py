"""Performance and Latency Benchmark Suite for Namma Connect V1 Release Candidate.

Measures p50, p95, p99, throughput, and error rates across critical paths:
1. Explore Category Feed (/recommendations/explore)
2. Multilingual / Geo Search (/services?search=Coorg)
3. Personalized Recommendation Feed (/recommendations/home)
4. Authoritative Service Availability (/services/{id}/availability)
5. Pessimistic Row-Locked Booking Creation (/bookings)
6. Provider Analytics Dashboard (/provider/analytics)
7. Namma AI Conversational Agent (/ai/agent/run)
"""

import os
import sys
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import time
import statistics
import json
import requests
from typing import List, Dict, Any
from sqlalchemy import text
from app.core.database import SessionLocal

BASE_URL = "http://127.0.0.1:8000/api/v2"

def get_auth_token(email: str, password: str = "123456789") -> str:
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if res.status_code == 200:
        return res.json()["access_token"]
    raise RuntimeError(f"Login failed for {email}: {res.text}")

def benchmark_endpoint(name: str, fn, iterations: int = 15) -> Dict[str, Any]:
    latencies = []
    errors = 0
    for _ in range(iterations):
        t0 = time.perf_counter()
        try:
            status_code = fn()
            if status_code not in (200, 201):
                errors += 1
        except Exception as e:
            errors += 1
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)

    latencies.sort()
    p50 = statistics.median(latencies)
    p95 = latencies[int(len(latencies) * 0.95)] if len(latencies) > 1 else latencies[0]
    p99 = latencies[int(len(latencies) * 0.99)] if len(latencies) > 1 else latencies[0]
    avg = statistics.mean(latencies)
    error_rate = (errors / iterations) * 100.0

    result = {
        "endpoint": name,
        "iterations": iterations,
        "p50_ms": round(p50, 2),
        "p95_ms": round(p95, 2),
        "p99_ms": round(p99, 2),
        "avg_ms": round(avg, 2),
        "error_rate_pct": round(error_rate, 2),
    }
    print(f"[{name}] p50={result['p50_ms']}ms | p95={result['p95_ms']}ms | p99={result['p99_ms']}ms | avg={result['avg_ms']}ms | errors={result['error_rate_pct']}%")
    return result

def run_performance_benchmarks():
    print("=" * 80)
    print("NAMMA CONNECT V1 RELEASE CANDIDATE PERFORMANCE & LATENCY BENCHMARK")
    print("=" * 80)

    cust_token = get_auth_token("priyanshu@gmail.com")
    prov_token = get_auth_token("arayn@gmail.com")
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    prov_headers = {"Authorization": f"Bearer {prov_token}"}

    # Fetch a sample service and slot with remaining capacity for availability and booking
    srv_res = requests.get(f"{BASE_URL}/services?limit=10", headers=cust_headers)
    sample_services = srv_res.json()["data"]["services"]
    
    target_service = None
    target_day = None
    target_slot = None

    for svc_item in sample_services:
        sid = svc_item["id"]
        r_avail = requests.get(f"{BASE_URL}/services/{sid}/availability", headers=cust_headers)
        if r_avail.status_code == 200:
            avail_data = r_avail.json().get("data", {})
            for d in avail_data.get("days", []):
                slots = [s for s in d.get("time_slots", []) if s.get("remaining_capacity", 0) >= 15]
                if slots:
                    target_service = svc_item
                    target_day = d
                    target_slot = slots[0]
                    break
        if target_slot:
            break

    if not target_service:
        # Fallback to first available
        target_service = sample_services[0]
        sample_srv_id = target_service["id"]
    else:
        sample_srv_id = target_service["id"]

    results = []

    # 1. Explore Feed
    results.append(benchmark_endpoint(
        "Explore Feed (/recommendations/explore)",
        lambda: requests.get(f"{BASE_URL}/recommendations/explore", headers=cust_headers).status_code,
        iterations=15
    ))

    # 2. Search
    results.append(benchmark_endpoint(
        "Marketplace Search (/services?search=Coorg)",
        lambda: requests.get(f"{BASE_URL}/services?search=Coorg", headers=cust_headers).status_code,
        iterations=15
    ))

    # 3. Personalized Recommendation Feed
    results.append(benchmark_endpoint(
        "Personalized Feed (/recommendations/home)",
        lambda: requests.get(f"{BASE_URL}/recommendations/home", headers=cust_headers).status_code,
        iterations=15
    ))

    # 4. Service Availability Check
    results.append(benchmark_endpoint(
        "Availability Check (/services/{id}/availability)",
        lambda: requests.get(f"{BASE_URL}/services/{sample_srv_id}/availability", headers=cust_headers).status_code,
        iterations=15
    ))

    # 5. Booking Creation (Row-locked transactional booking)
    created_booking_ids = []
    if target_slot and target_day:
        def create_sample_booking():
            payload = {
                "service_id": sample_srv_id,
                "start_date": target_day["date"],
                "time_slot_id": target_slot["id"],
                "time_slot_label": f"{target_slot.get('start_time', '')} - {target_slot.get('end_time', '')}",
                "guest_count": 1,
                "special_requests": "Benchmark performance test",
            }
            res = requests.post(f"{BASE_URL}/bookings", json=payload, headers=cust_headers)
            if res.status_code == 201:
                created_booking_ids.append(res.json()["data"]["id"])
            return res.status_code

        results.append(benchmark_endpoint(
            "Booking Creation (/bookings)",
            create_sample_booking,
            iterations=10
        ))
    else:
        print("[SKIP] Booking creation benchmark skipped (no suitable high-capacity slot found)")

    # 6. Provider Analytics Dashboard
    results.append(benchmark_endpoint(
        "Provider Analytics (/provider/analytics/overview)",
        lambda: requests.get(f"{BASE_URL}/provider/analytics/overview", headers=prov_headers).status_code,
        iterations=15
    ))

    # 7. Namma AI Agent Run (Natural Language Planning)
    results.append(benchmark_endpoint(
        "Namma AI Agent Run (/ai/agent/run)",
        lambda: requests.post(
            f"{BASE_URL}/ai/agent/run",
            json={"message": "Suggest a quiet coffee estate in Kodagu under 5000"},
            headers=cust_headers
        ).status_code,
        iterations=5
    ))

    # Cleanup any created test bookings
    if created_booking_ids:
        db = SessionLocal()
        try:
            for bid in created_booking_ids:
                db.execute(text("DELETE FROM payments WHERE booking_id = :bid"), {"bid": bid})
                db.execute(text("DELETE FROM bookings WHERE id = :bid"), {"bid": bid})
            db.commit()
            print(f"[CLEANUP] Successfully removed {len(created_booking_ids)} benchmark booking records.")
        finally:
            db.close()

    print("\n" + "=" * 80)
    print("NAMMA CONNECT V1 RC LATENCY & PERFORMANCE SUMMARY")
    print("=" * 80)
    print(f"{'Endpoint':<45} | {'p50 (ms)':<9} | {'p95 (ms)':<9} | {'p99 (ms)':<9} | {'Avg (ms)':<9} | {'Error %':<7}")
    print("-" * 92)
    for r in results:
        print(f"{r['endpoint']:<45} | {r['p50_ms']:<9} | {r['p95_ms']:<9} | {r['p99_ms']:<9} | {r['avg_ms']:<9} | {r['error_rate_pct']:<7}")
    print("=" * 80)

    # Save results to a json file for report inclusion
    with open("benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_performance_benchmarks()
