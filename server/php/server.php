<?php

// Set your PRIVATE_KEY and ARC_KEY through environment variables or directly
$PRIVATE_KEY = getenv('PRIVATE_KEY');
$ARC_KEY = getenv('ARC_KEY');

// Example database for storing orders
$shopDatabase = [];

// Function to handle Webhook
function handleWebhook()
{
    global $PRIVATE_KEY, $shopDatabase;

    // Get the request body
    $payload = file_get_contents('php://input');
    $data = json_decode($payload, true);

    // Check for the signature header
    if (!isset($_SERVER['HTTP_X_SIGNATURE'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing signature header']);
        return;
    }

    $signature = $_SERVER['HTTP_X_SIGNATURE'];
    
    // Calculate the expected signature
    $expectedSignature = hash_hmac('sha256', $payload, $PRIVATE_KEY);
    
    // Verify the signature
    if (!hash_equals($expectedSignature, $signature)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid signature']);
        return;
    }

    // Process the data if the signature is valid
    if ($data['event'] === 'order.status.changed') {
        $orderId = $data['data']['uuid'];
        $status = $data['data']['status'];
        
        // Update the order database
        $shopDatabase[$orderId] = $data['data'];
        
        if ($status === 'received') {
            error_log("Order {$orderId} received successfully!");
        }
    }

    http_response_code(200);
    echo json_encode(['status' => 'Webhook received successfully']);
}

// Function to create an order
function createOrder()
{
    global $ARC_KEY;

    $url = "https://arcpay.online/api/v1/arcpay/order";

    // Order data parameters
    $orderData = [
        "title" => "Premium Subscription Box",
        "orderId" => 'INV-' . date('YmdHis'),
        "currency" => "TON",
        "items" => [
            [
                "title" => "Exclusive Travel Package",
                "description" => "A luxurious 5-day trip to Bali with first-class accommodation.",
                "imageUrl" => "https://www.luxurytravelmagazine.com/files/610/1/2901/Kayon-Jungle-aerial_reg.jpg",
                "price" => 0.500,
                "count" => 1,
                "itemId" => "id-987654"
            ],
            [
                "title" => "Gourmet Dinner Experience",
                "description" => "A 7-course gourmet dinner at a Michelin-starred restaurant.",
                "imageUrl" => "https://www.luxurytravelmagazine.com/files/610/2/2572/Samabe-restaurant_big_reg.jpg",
                "price" => 0.150,
                "count" => 2,
                "itemId" => "id-654321"
            ]
        ],
        "meta" => [
            "telegram_id" => $_POST['telegram_id'] ?? null
        ],
        "captured" => false
    ];

    // Initialize cURL to send the request
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'ArcKey: ' . $ARC_KEY
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($orderData));

    // Send the request and handle the response
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        $result = json_decode($response, true);
        error_log('Order created successfully: ' . print_r($result, true));
        echo json_encode($result);
    } else {
        error_log("Failed to create order. Status: {$httpCode}, Error: {$response}");
        http_response_code($httpCode);
        echo json_encode(['error' => 'Failed to create order']);
    }
}

// Function to return the order database
function getShopDatabase()
{
    global $shopDatabase;
    header('Content-Type: application/json');
    echo json_encode($shopDatabase);
}

// Define routes
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Route handling based on URI and request method
if ($requestUri === '/webhook' && $requestMethod === 'POST') {
    handleWebhook();
} elseif ($requestUri === '/create' && $requestMethod === 'POST') {
    createOrder();
} elseif ($requestUri === '/' && $requestMethod === 'GET') {
    getShopDatabase();
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
}
