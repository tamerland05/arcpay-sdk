import hashlib
import hmac
import json
import os
from datetime import datetime

import aiohttp_cors
from aiohttp import ClientSession, TCPConnector, web

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
ARC_KEY = os.getenv("ARC_KEY")

shop_database = {}


async def handle_webhook(request):
    try:
        # Read the request body
        raw_body_bytes = await request.read()
        raw_body = raw_body_bytes.decode("utf-8")
        data = json.loads(raw_body)

        # Get the signature from the request headers
        signature = request.headers.get("X-Signature")
        if not signature:
            return web.Response(status=400, text="Missing signature header")

        # Calculate the expected signature
        expected_signature = hmac.new(
            PRIVATE_KEY.encode("utf-8"), raw_body_bytes, hashlib.sha256
        ).hexdigest()

        # Validate the signature
        if not hmac.compare_digest(signature, expected_signature):
            return web.Response(status=403, text="Invalid signature")

        # Process the request
        # Add your logic here to handle the received data
        print(f"Received data: {data}")

        if data["event"] == "order.status.changed":
            shop_database[data["data"]["uuid"]] = data["data"]  # update store order
            if shop_database[data["data"]["uuid"]]["status"] == "received":
                print("Order received successfully, we capture it!")

        return web.Response(status=200, text="Webhook received successfully")

    except json.JSONDecodeError:
        return web.Response(status=400, text="Invalid JSON format")
    except Exception as e:
        return web.Response(status=500, text=f"Unexpected error: {str(e)}")


async def create_order(request):

    request_data = await request.json()

    print(request_data)

    url = "https://arcpay.online/api/v1/arcpay/order"
    headers = {"Content-Type": "application/json", "ArcKey": ARC_KEY}

    data = {
        "title": "Premium Subscription Box",
        "orderId": f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "currency": "TON",
        "items": [
            {
                "title": "Exclusive Travel Package",
                "description": "A luxurious 5-day trip to Bali with first-class accommodation.",
                "imageUrl": "https://www.luxurytravelmagazine.com/files/610/1/2901/Kayon-Jungle-aerial_reg.jpg",
                "price": 0.500,
                "count": 1,
                "itemId": "id-987654",
            },
            {
                "title": "Gourmet Dinner Experience",
                "description": "A 7-course gourmet dinner at a Michelin-starred restaurant.",
                "imageUrl": "https://www.luxurytravelmagazine.com/files/610/2/2572/Samabe-restaurant_big_reg.jpg",
                "price": 0.150,
                "count": 2,
                "itemId": "id-654321",
            },
        ],
        "meta": {
            "telegram_id": (
                request_data["telegram_id"] if "telegram_id" in request_data else None
            )
        },
        "captured": False,
    }
    result = None
    async with ClientSession(connector=TCPConnector(ssl=False)) as session:
        async with session.post(url, json=data, headers=headers) as response:
            if response.status == 200:
                result = await response.json()
                print(f"Order created successfully: {result}")
                # Process the response
                # Add your logic here to handle the received data
                shop_database[result["uuid"]] = result  # example store order
                return web.json_response(result)
            else:
                print(
                    f"Failed to create order. Status: {response.status}, Error: {await response.text()}"
                )


async def get_shop_database(request):
    return web.json_response(shop_database)


# To run the server
def create_app():
    app = web.Application()
    cors = aiohttp_cors.setup(
        app,
        defaults={
            "*": aiohttp_cors.ResourceOptions(
                allow_credentials=True,
                expose_headers="*",
                allow_headers="*",
                allow_methods=["POST", "GET", "OPTIONS"],
            )
        },
    )
    app.router.add_post("/create", create_order)
    app.router.add_post("/webhook", handle_webhook)
    app.router.add_get("/", get_shop_database)
    for route in list(app.router.routes()):
        cors.add(route)
    return app


if __name__ == "__main__":
    web.run_app(create_app(), port=1080)
