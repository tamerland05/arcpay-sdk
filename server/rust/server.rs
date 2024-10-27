use actix_web::{web, App, HttpResponse, HttpServer, post, get, Responder};
use dotenv::dotenv;
use std::collections::HashMap;
use std::env;
use serde::{Deserialize, Serialize};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use hex::encode;
use reqwest::Client;
use std::sync::Mutex;

// Type alias for HMAC-SHA256
type HmacSha256 = Hmac<Sha256>;

// In-memory order database
struct AppState {
    shop_database: Mutex<HashMap<String, Order>>,
}

// Order struct to represent an order
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Order {
    uuid: String,
    status: String,
}

// Data payload for order creation
#[derive(Debug, Serialize)]
struct OrderData {
    title: String,
    order_id: String,
    currency: String,
    items: Vec<Item>,
    meta: Meta,
    captured: bool,
}

// Item struct for items in the order
#[derive(Debug, Serialize)]
struct Item {
    title: String,
    description: String,
    image_url: String,
    price: f64,
    count: i32,
    item_id: String,
}

// Meta struct for additional metadata
#[derive(Debug, Serialize)]
struct Meta {
    telegram_id: Option<String>,
}

// Webhook request handler
#[post("/webhook")]
async fn handle_webhook(
    state: web::Data<AppState>,
    req_body: String,
    req: actix_web::HttpRequest,
) -> impl Responder {
    let private_key = env::var("PRIVATE_KEY").expect("PRIVATE_KEY not set");
    let signature = req.headers().get("X-Signature").and_then(|v| v.to_str().ok());

    if signature.is_none() {
        return HttpResponse::BadRequest().body("Missing signature header");
    }

    // Calculate HMAC signature
    let mut mac = HmacSha256::new_from_slice(private_key.as_bytes()).expect("HMAC can take key of any size");
    mac.update(req_body.as_bytes());
    let expected_signature = encode(mac.finalize().into_bytes());

    if signature.unwrap() != expected_signature {
        return HttpResponse::Forbidden().body("Invalid signature");
    }

    // Deserialize JSON and process event
    let data: serde_json::Value = serde_json::from_str(&req_body).unwrap();
    if let Some(event) = data["event"].as_str() {
        if event == "order.status.changed" {
            let order_data = &data["data"];
            let order_id = order_data["uuid"].as_str().unwrap().to_string();
            let status = order_data["status"].as_str().unwrap().to_string();

            // Update order status in the in-memory database
            let mut db = state.shop_database.lock().unwrap();
            db.insert(order_id.clone(), Order { uuid: order_id.clone(), status: status.clone() });

            if status == "received" {
                println!("Order {} received successfully!", order_id);
            }
        }
    }

    HttpResponse::Ok().json({"status": "Webhook received successfully"})
}

// Order creation request handler
#[post("/create")]
async fn create_order(state: web::Data<AppState>) -> impl Responder {
    let arc_key = env::var("ARC_KEY").expect("ARC_KEY not set");

    let order_data = OrderData {
        title: "Premium Subscription Box".to_string(),
        order_id: format!("INV-{}", chrono::Utc::now().format("%Y%m%d%H%M%S")),
        currency: "TON".to_string(),
        items: vec![
            Item {
                title: "Exclusive Travel Package".to_string(),
                description: "A luxurious 5-day trip to Bali with first-class accommodation.".to_string(),
                image_url: "https://www.luxurytravelmagazine.com/files/610/1/2901/Kayon-Jungle-aerial_reg.jpg".to_string(),
                price: 0.500,
                count: 1,
                item_id: "id-987654".to_string(),
            },
            Item {
                title: "Gourmet Dinner Experience".to_string(),
                description: "A 7-course gourmet dinner at a Michelin-starred restaurant.".to_string(),
                image_url: "https://www.luxurytravelmagazine.com/files/610/2/2572/Samabe-restaurant_big_reg.jpg".to_string(),
                price: 0.150,
                count: 2,
                item_id: "id-654321".to_string(),
            },
        ],
        meta: Meta {
            telegram_id: Some("123456789".to_string()),
        },
        captured: false,
    };

    let client = Client::new();
    let res = client.post("https://arcpay.online/api/v1/arcpay/order")
        .header("Content-Type", "application/json")
        .header("ArcKey", arc_key)
        .json(&order_data)
        .send()
        .await;

    match res {
        Ok(response) => {
            if response.status().is_success() {
                let result: Order = response.json().await.unwrap();
                let mut db = state.shop_database.lock().unwrap();
                db.insert(result.uuid.clone(), result.clone());
                HttpResponse::Ok().json(result)
            } else {
                HttpResponse::InternalServerError().body("Failed to create order")
            }
        }
        Err(_) => HttpResponse::InternalServerError().body("Failed to create order"),
    }
}

// Retrieve shop database
#[get("/")]
async fn get_shop_database(state: web::Data<AppState>) -> impl Responder {
    let db = state.shop_database.lock().unwrap();
    let db_json = serde_json::to_string(&*db).unwrap();
    HttpResponse::Ok().body(db_json)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let port = env::var("PORT").unwrap_or_else(|_| "1080".to_string());

    let data = web::Data::new(AppState {
        shop_database: Mutex::new(HashMap::new()),
    });

    HttpServer::new(move || {
        App::new()
            .app_data(data.clone())
            .service(handle_webhook)
            .service(create_order)
            .service(get_shop_database)
    })
    .bind(format!("0.0.0.0:{}", port))?
    .run()
    .await
}
