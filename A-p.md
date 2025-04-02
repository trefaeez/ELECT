Api Root

Api Root
The default basic root view for DefaultRouter

GET /api/
HTTP 200 OK
Allow: GET, HEAD, OPTIONS
Content-Type: application/json
Vary: Accept

{
    "powersources": "http://127.0.0.1:8000/api/powersources/",
    "panels": "http://127.0.0.1:8000/api/panels/",
    "loads": "http://127.0.0.1:8000/api/loads/",
    "circuitbreakers": "http://127.0.0.1:8000/api/circuitbreakers/"
}