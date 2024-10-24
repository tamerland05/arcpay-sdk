# arcpay-sdk

ArcPay sdk

## Install package

```
npm i @arcpay/react-sdk
```

## Usage Examples

1. Create merchant account
   - Use the @arcpaybot to create a merchant account and obtain your API keys.
2. Set Up the Backend Server

   - Navigate to the server/python/ directory.
   - Configure your API keys in `server.py`.
   - Install the required dependencies:

   ```
   pip install -r requirements.txt
   ```

   - Run the server:

   ```
   python server.py
   ```

   - The server will run locally on port 1080.

3. Set Up the React Client
   - Navigate to the client/react-ts/ directory
   - Install dependences `npm i`
   - Start the React application:: `npm run dev`
   - To configure the backend URL, edit the `api.ts` file.

## How it work

1. React app via backend (server.py) create order
2. React app subscribe on change order status
3. Using link or @arcpay/react-sdk processed payment
