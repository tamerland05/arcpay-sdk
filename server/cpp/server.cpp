#include "crow_all.h"        // Crow framework
#include <openssl/hmac.h>    // OpenSSL for HMAC
#include <nlohmann/json.hpp> // JSON library
#include <fstream>
#include <unordered_map>
#include <string>
#include <ctime>
#include <iomanip>
#include <sstream>

// Удобные алиасы
using json = nlohmann::json;
using OrderDatabase = std::unordered_map<std::string, json>;

// Глобальные переменные
OrderDatabase shopDatabase;
std::string privateKey;
std::string arcKey;

// Функция для загрузки переменных окружения из файла .env
void loadEnv()
{
    std::ifstream envFile(".env");
    std::string line;
    while (std::getline(envFile, line))
    {
        size_t pos = line.find('=');
        if (pos != std::string::npos)
        {
            std::string key = line.substr(0, pos);
            std::string value = line.substr(pos + 1);
            if (key == "PRIVATE_KEY")
                privateKey = value;
            if (key == "ARC_KEY")
                arcKey = value;
        }
    }
}

// Функция для вычисления HMAC подписи
std::string hmacSha256(const std::string &key, const std::string &data)
{
    unsigned char *digest;
    digest = HMAC(EVP_sha256(), key.c_str(), key.length(),
                  reinterpret_cast<const unsigned char *>(data.c_str()), data.length(), NULL, NULL);
    char mdString[65];
    for (int i = 0; i < 32; i++)
        sprintf(&mdString[i * 2], "%02x", (unsigned int)digest[i]);
    return std::string(mdString);
}

// Обработчик Webhook
void handleWebhook(const crow::request &req, crow::response &res)
{
    std::string signature = req.get_header_value("X-Signature");
    if (signature.empty())
    {
        res.code = 400;
        res.write("Missing signature header");
        res.end();
        return;
    }

    std::string payload = req.body;
    std::string expectedSignature = hmacSha256(privateKey, payload);

    if (signature != expectedSignature)
    {
        res.code = 403;
        res.write("Invalid signature");
        res.end();
        return;
    }

    // Обработка данных
    auto data = json::parse(payload);
    if (data["event"] == "order.status.changed")
    {
        std::string orderId = data["data"]["uuid"];
        std::string status = data["data"]["status"];

        // Обновление базы данных
        shopDatabase[orderId] = data["data"];
        if (status == "received")
        {
            CROW_LOG_INFO << "Order " << orderId << " received successfully!";
        }
    }

    res.code = 200;
    res.write("Webhook received successfully");
    res.end();
}

// Функция для создания заказа
void createOrder(const crow::request &req, crow::response &res)
{
    std::string url = "https://arcpay.online/api/v1/arcpay/order";

    // Данные заказа
    json orderData = {
        {"title", "Premium Subscription Box"},
        {"orderId", "INV-" + std::to_string(std::time(nullptr))},
        {"currency", "TON"},
        {"items", {{{"title", "Exclusive Travel Package"}, {"description", "A luxurious 5-day trip to Bali with first-class accommodation."}, {"imageUrl", "https://www.luxurytravelmagazine.com/files/610/1/2901/Kayon-Jungle-aerial_reg.jpg"}, {"price", 0.500}, {"count", 1}, {"itemId", "id-987654"}}, {{"title", "Gourmet Dinner Experience"}, {"description", "A 7-course gourmet dinner at a Michelin-starred restaurant."}, {"imageUrl", "https://www.luxurytravelmagazine.com/files/610/2/2572/Samabe-restaurant_big_reg.jpg"}, {"price", 0.150}, {"count", 2}, {"itemId", "id-654321"}}}},
        {"meta", {{"telegram_id", req.url_params.get("telegram_id")}}},
        {"captured", false}};

    // Инициализация CURL для отправки POST запроса
    CURL *curl = curl_easy_init();
    if (curl)
    {
        std::string responseString;
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, orderData.dump().c_str());
        struct curl_slist *headers = nullptr;
        headers = curl_slist_append(headers, ("ArcKey: " + arcKey).c_str());
        headers = curl_slist_append(headers, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, [](char *ptr, size_t size, size_t nmemb, std::string *data)
                         {
            data->append(ptr, size * nmemb);
            return size * nmemb; });
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseString);
        curl_easy_perform(curl);
        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);

        auto responseJson = json::parse(responseString);
        shopDatabase[responseJson["uuid"]] = responseJson;
        res.code = 200;
        res.write(responseJson.dump());
    }
    else
    {
        res.code = 500;
        res.write("Failed to create order");
    }
    res.end();
}

// Обработчик для получения базы данных заказов
void getShopDatabase(const crow::request &, crow::response &res)
{
    res.set_header("Content-Type", "application/json");
    res.write(json(shopDatabase).dump());
    res.end();
}

int main()
{
    loadEnv();
    crow::SimpleApp app;

    CROW_ROUTE(app, "/webhook").methods("POST"_method)(handleWebhook);
    CROW_ROUTE(app, "/create").methods("POST"_method)(createOrder);
    CROW_ROUTE(app, "/")
    ([](const crow::request &req, crow::response &res)
     { getShopDatabase(req, res); });

    app.port(8080).multithreaded().run();
}
