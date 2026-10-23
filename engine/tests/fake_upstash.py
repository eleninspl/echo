"""Upstash's REST API in memory, for the commands the engine sends. Expiry isn't kept: no test waits for it."""

import json

import httpx

from echo_engine.store import Upstash

URL = "https://fake.upstash.io"
TOKEN = "test-token"


class FakeUpstash:
    def __init__(self) -> None:
        self.data: dict[str, str] = {}

    def handler(self, request: httpx.Request) -> httpx.Response:
        if request.headers.get("authorization") != f"Bearer {TOKEN}":
            return httpx.Response(401, json={"error": "Unauthorized"})
        if request.url.path != "/pipeline":
            return httpx.Response(404)
        return httpx.Response(200, json=[self.run(*command) for command in json.loads(request.content)])

    def run(self, name: str, *args: str) -> dict:
        match name.upper():
            case "INCR" | "DECR":
                value = int(self.data.get(args[0], 0)) + (1 if name.upper() == "INCR" else -1)
                self.data[args[0]] = str(value)
                return {"result": value}
            case "EXPIRE":
                return {"result": int(args[0] in self.data)}
            case "GET":
                return {"result": self.data.get(args[0])}
            case "SET":
                self.data[args[0]] = args[1]
                return {"result": "OK"}
        return {"error": f"ERR unknown command '{name}'"}

    def client(self, token: str = TOKEN) -> Upstash:
        """A new Upstash client on the same data, as another instance would have."""
        return Upstash(URL, token, transport=httpx.MockTransport(self.handler))
