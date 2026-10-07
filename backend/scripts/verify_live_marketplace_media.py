import requests

def test_live_marketplace():
    res = requests.get("http://127.0.0.1:8000/api/v2/services?limit=5")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    services = data.get("data", {}).get("services", [])
    print(f"Total services returned: {len(services)}")
    for srv in services:
        title = srv.get("title")
        primary = srv.get("primary_image")
        avatar = srv.get("provider_avatar")
        images = srv.get("images", [])
        print(f"Title:   {title}")
        print(f"Primary: {primary}")
        print(f"Images:  {images}")
        print(f"Avatar:  {avatar}")
        print("-" * 50)
        assert primary.startswith("https://images.unsplash.com/"), f"Expected Unsplash URL, got {primary}"
        assert avatar.startswith("https://api.dicebear.com/"), f"Expected DiceBear avatar, got {avatar}"
        for img in images:
            assert img.startswith("https://images.unsplash.com/"), f"Expected Unsplash gallery image, got {img}"

    print("ALL LIVE MARKETPLACE SERVICES RETURN AUTHENTIC UNSPLASH AND DICEBEAR URLS!")

if __name__ == "__main__":
    test_live_marketplace()
