using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

// Пример базы данных для хранения заказов
var shopDatabase = new Dictionary<string, Order>();

app.MapPost("/webhook", async (HttpRequest request, IConfiguration config) =>
{
    // Получаем PRIVATE_KEY из конфигурации
    string privateKey = config["ArcPay:PrivateKey"];
    string signature = request.Headers["X-Signature"];

    if (string.IsNullOrEmpty(signature))
    {
        return Results.BadRequest("Missing signature header");
    }

    using var reader = new StreamReader(request.Body);
    var payload = await reader.ReadToEndAsync();
    
    // Подсчитываем ожидаемую подпись
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(privateKey));
    var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
    var expectedSignature = BitConverter.ToString(computedHash).Replace("-", "").ToLower();

    if (signature != expectedSignature)
    {
        return Results.StatusCode(403, "Invalid signature");
    }

    // Обработка данных Webhook
    var data = JsonConvert.DeserializeObject<Dictionary<string, object>>(payload);
    if (data?["event"]?.ToString() == "order.status.changed")
    {
        var orderData = JsonConvert.DeserializeObject<OrderData>(data["data"].ToString());
        shopDatabase[orderData.Uuid] = new Order { UUID = orderData.Uuid, Status = orderData.Status };

        if (orderData.Status == "received")
        {
            Console.WriteLine($"Order {orderData.Uuid} received successfully!");
        }
    }

    return Results.Ok(new { status = "Webhook received successfully" });
});

app.MapPost("/create", async (IConfiguration config, HttpContext httpContext) =>
{
    string arcKey = config["ArcPay:ArcKey"];
    var url = "https://arcpay.online/api/v1/arcpay/order";

    var orderData = new
    {
        title = "Premium Subscription Box",
        orderId = "INV-" + DateTime.UtcNow.ToString("yyyyMMddHHmmss"),
        currency = "TON",
        items = new[]
        {
            new {
                title = "Exclusive Travel Package",
                description = "A luxurious 5-day trip to Bali with first-class accommodation.",
                imageUrl = "https://www.luxurytravelmagazine.com/files/610/1/2901/Kayon-Jungle-aerial_reg.jpg",
                price = 0.500,
                count = 1,
                itemId = "id-987654"
            },
            new {
                title = "Gourmet Dinner Experience",
                description = "A 7-course gourmet dinner at a Michelin-starred restaurant.",
                imageUrl = "https://www.luxurytravelmagazine.com/files/610/2/2572/Samabe-restaurant_big_reg.jpg",
                price = 0.150,
                count = 2,
                itemId = "id-654321"
            }
        },
        meta = new { telegram_id = httpContext.Request.Form["telegram_id"] },
        captured = false
    };

    using var client = new HttpClient();
    client.DefaultRequestHeaders.Add("ArcKey", arcKey);
    var content = new StringContent(JsonConvert.SerializeObject(orderData), Encoding.UTF8, "application/json");

    var response = await client.PostAsync(url, content);
    var responseBody = await response.Content.ReadAsStringAsync();

    if (!response.IsSuccessStatusCode)
    {
        Console.WriteLine($"Failed to create order. Status: {response.StatusCode}, Error: {responseBody}");
        return Results.StatusCode((int)response.StatusCode, "Failed to create order");
    }

    var result = JsonConvert.DeserializeObject<Order>(responseBody);
    shopDatabase[result.UUID] = result;

    return Results.Ok(result);
});

app.MapGet("/", () => Results.Ok(shopDatabase));

app.Run();

// Вспомогательные классы
public class Order
{
    public string UUID { get; set; }
    public string Status { get; set; }
}

public class OrderData
{
    public string Uuid { get; set; }
    public string Status { get; set; }
}
