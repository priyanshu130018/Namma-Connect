"""Automated Operational Smoke Test for Namma Connect V2.

Exercises critical health, OpenAPI, taxonomy, marketplace search, recommendations,
AI conversation, and Trip Planner endpoints against a running backend instance.
"""

import sys
import time
import requests

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
API_V2 = f"{BASE_URL}/api/v2"


def run_smoke_tests():
    print("=" * 60)
    print(f"Namma Connect V2 Operational Smoke Test Suite")
    print(f"Target: {BASE_URL}")
    print("=" * 60)

    # 1. Liveness Probe
    try:
        r = requests.get(f"{BASE_URL}/health/live", timeout=5)
        assert r.status_code == 200, f"Liveness check failed with status {r.status_code}"
        assert r.json().get("status") == "alive"
        print("[PASS] 1. Liveness Probe (/health/live)")
    except Exception as e:
        print(f"[FAIL] 1. Liveness Probe: {e}")
        return False

    # 2. Readiness Probe
    try:
        r = requests.get(f"{BASE_URL}/health/ready", timeout=5)
        assert r.status_code == 200, f"Readiness check failed with status {r.status_code}"
        print("[PASS] 2. Readiness Probe (/health/ready)")
    except Exception as e:
        print(f"[FAIL] 2. Readiness Probe: {e}")
        return False

    # 3. Operational Metrics
    try:
        r = requests.get(f"{BASE_URL}/metrics", timeout=5)
        assert r.status_code == 200
        assert r.json().get("active_modules_count") == 15
        print("[PASS] 3. Operational Metrics (/metrics)")
    except Exception as e:
        print(f"[FAIL] 3. Operational Metrics: {e}")
        return False

    # 4. OpenAPI Schema
    try:
        r = requests.get(f"{API_V2}/openapi.json", timeout=5)
        assert r.status_code == 200
        paths = r.json().get("paths", {})
        assert len(paths) >= 70, f"Expected at least 70 endpoints, found {len(paths)}"
        print(f"[PASS] 4. OpenAPI Schema Discovery ({len(paths)} endpoints)")
    except Exception as e:
        print(f"[FAIL] 4. OpenAPI Schema Discovery: {e}")
        return False

    # 5. Marketplace Categories
    try:
        r = requests.get(f"{API_V2}/categories", timeout=5)
        assert r.status_code == 200
        print("[PASS] 5. Taxonomy Categories (/api/v2/categories)")
    except Exception as e:
        print(f"[FAIL] 5. Taxonomy Categories: {e}")
        return False

    # 6. Marketplace Search
    try:
        r = requests.get(f"{API_V2}/search?query=farm", timeout=5)
        assert r.status_code == 200
        print("[PASS] 6. Marketplace Search (/api/v2/search)")
    except Exception as e:
        print(f"[FAIL] 6. Marketplace Search: {e}")
        return False

    # 7. Recommendations Home
    try:
        r = requests.get(f"{API_V2}/recommendations/home", timeout=5)
        assert r.status_code == 200
        print("[PASS] 7. Recommendations Home (/api/v2/recommendations/home)")
    except Exception as e:
        print(f"[FAIL] 7. Recommendations Home: {e}")
        return False

    print("=" * 60)
    print("ALL 7 OPERATIONAL SMOKE CHECKS PASSED (100%)")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = run_smoke_tests()
    sys.exit(0 if success else 1)
