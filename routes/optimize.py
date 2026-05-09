import os
import requests
from ortools.constraint_solver import routing_enums_pb2, pywrapcp

MAPBOX_BASE = "https://api.mapbox.com"

def get_token() -> str:
    token = os.environ.get("MAPBOX_ACCESS_TOKEN")
    if not token:
        raise RuntimeError("MAPBOX_ACCESS_TOKEN not set in environment")
    return token

def geocode_address(address: str) -> dict:
    url = f"{MAPBOX_BASE}/geocoding/v5/mapbox.places/{requests.utils.quote(address)}.json"
    resp = requests.get(url, params={"access_token": get_token(), "limit": 1}, timeout=10)
    resp.raise_for_status()
    features = resp.json().get("features", [])
    if not features:
        raise ValueError(f"Could not geocode address: {address}")
    lng, lat = features[0]["geometry"]["coordinates"]
    return {"lat": lat, "lng": lng, "formatted": features[0]["place_name"]}

def build_distance_matrix(locations: list[dict]) -> list[list[int]]:
    coords = ";".join(f"{loc['lng']},{loc['lat']}" for loc in locations)
    url = f"{MAPBOX_BASE}/directions-matrix/v1/mapbox/driving/{coords}"
    resp = requests.get(url, params={"access_token": get_token(), "annotations": "duration"}, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    raw = data.get("durations", [])
    n = len(locations)
    matrix = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            val = raw[i][j]
            matrix[i][j] = int(val) if val is not None else 999_999
    return matrix

def solve_tsp(distance_matrix: list[list[int]], depot: int = 0) -> list[int]:
    n = len(distance_matrix)
    manager = pywrapcp.RoutingIndexManager(n, 1, depot)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        return distance_matrix[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_params.time_limit.seconds = 5
    solution = routing.SolveWithParameters(search_params)
    if not solution:
        return list(range(n))
    route = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        route.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))
    return route

def optimize_route(job_addresses: list[str], start_address: str, current_location: dict = None) -> dict:
    if current_location:
        depot_location = current_location
        depot_label = "Current Location"
    else:
        depot_location = geocode_address(start_address)
        depot_label = start_address

    geocoded_jobs = []
    for addr in job_addresses:
        g = geocode_address(addr)
        g["original"] = addr
        geocoded_jobs.append(g)

    all_locations = [depot_location] + geocoded_jobs
    matrix = build_distance_matrix(all_locations)
    order = solve_tsp(matrix, depot=0)

    stops = []
    total_seconds = 0
    for i, idx in enumerate(order):
        if idx == 0:
            continue
        job = geocoded_jobs[idx - 1]
        travel_from_prev = matrix[order[i - 1]][idx] if i > 0 else 0
        total_seconds += travel_from_prev
        stops.append({
            "stop_number": len(stops) + 1,
            "address": job["formatted"],
            "original_address": job["original"],
            "lat": job["lat"],
            "lng": job["lng"],
            "cumulative_drive_minutes": round(total_seconds / 60, 1),
        })

    apple_maps_url = ""
    if stops:
        dest = stops[-1]
        apple_maps_url = (
            f"http://maps.apple.com/?saddr={depot_location['lat']},{depot_location['lng']}"
            f"&daddr={dest['lat']},{dest['lng']}&dirflg=d"
        )

    return {
        "depot": depot_label,
        "optimized_stops": stops,
        "total_stops": len(stops),
        "estimated_total_drive_minutes": round(total_seconds / 60, 1),
        "apple_maps_url": apple_maps_url,
    }
