# How to Run the Project

## 0. Install Node.js
First, install the required Node.js packages by running:
```
npm i
```
## 1. Create .env File from .env.example
Create a new `.env` file and fill in the following details from `.env.example`:
```
PORT=
JWT_SECRET=""
ENDPOINT=""
```
## 2. Initialize the Database
Run the following command to initialize the database:
```
npm run migration
```
Ensure that the user is specified in the migration file.

## 3. Start the Application
Finally, start the application using:
```
npm start
```
