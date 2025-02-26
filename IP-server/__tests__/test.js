const request = require("supertest");
const app = require("../app"); // Assuming your Express app is in the 'app.js' file
const {
  User,
  Product,
  Category,
  FAQ,
  Order,
  Cart,
  OrderCart,
  sequelize,
} = require("../models");
const { signToken } = require("../helpers/jwt");
const { hashPassword } = require("../helpers/bycriptjs");
const { queryInterface } = sequelize;

let token; // Store token for authenticated requests

// beforeAll(async () => {
//   await sequelize.sync({ force: true }); // Drops all tables and recreates them

//   let dataCategory = require("../data/category.json").map((e) => {
//     e.createdAt = e.updatedAt = new Date();
//     return e;
//   });
//   await queryInterface.bulkInsert("Categories", dataCategory, {});

//   // Retrieve category IDs after inserting categories --> ensure seeding category is finished
//   const categories = await Category.findAll();
//   //   console.log("🚀 ~ beforeAll ~ categories:", categories);

//   // Create a test user for login
//   const users = require("../data/user.json");
//   const hashedUsersData = await Promise.all(
//     users.map(async (e) => {
//       const hashedPassword = hashPassword(e.password);
//       return {
//         ...e,
//         password: hashedPassword,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       };
//     })
//   );

//   let dataProduct = require("../data/product.json").map((e) => {
//     e.createdAt = e.updatedAt = new Date();
//     return e;
//   });

//   await queryInterface.bulkInsert("Users", hashedUsersData, {});
//   await queryInterface.bulkInsert("Products", dataProduct, {});

//   const userTest = await User.findOne({ where: { role: "Customer" } });
//   token = signToken({ id: userTest.id });
// });

// afterAll(async () => {
//   // Clean up the database after tests
//   await queryInterface.bulkDelete("Users", null, {
//     cascade: true,
//     truncate: true,
//     restartIdentity: true,
//   });
//   await queryInterface.bulkDelete("Categories", null, {
//     cascade: true,
//     truncate: true,
//     restartIdentity: true,
//   });
//   await queryInterface.bulkDelete("Products", null, {
//     cascade: true,
//     truncate: true,
//     restartIdentity: true,
//   });

//   await queryInterface.bulkDelete("Orders", null, {
//     cascade: true,
//     truncate: true,
//     restartIdentity: true,
//   });
//   await queryInterface.bulkDelete("Carts", null, {
//     cascade: true,
//     truncate: true,
//     restartIdentity: true,
//   });
//   await queryInterface.bulkDelete("OrderCarts", null, {
//     cascade: true,
//     truncate: true,
//     restartIdentity: true,
//   });
// });

// list of public endpoints
// get /products
// get /products/:id
// get /categories
// post /login
// post /register
// get /pub/faqs

// list of authenticated endpoints (token)
// get /faqs
// get /orders
// get /orders/:id
// post /orders

// CRUD cart
// get /cart
// post /cart
// put /cart/:id
// delete /cart/:id

describe("GET /products", () => {
  it("Berhasil mendapatkan Entitas Utama tanpa menggunakan query filter parameter", async () => {
    const response = await request(app).get("/products");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body).toHaveProperty("currentPage", 1);
    expect(response.body).toHaveProperty("size", 10);
    expect(response.body).toHaveProperty("totalPages");
    expect(response.body).toHaveProperty("totalProducts");
    expect(response.body.data.length).toBeLessThanOrEqual(10); // Less than or max is the limit
  });
  it("Berhasil mendapatkan Entitas Utama dengan 1 query filter parameter", async () => {
    const category = "Electronics"; // from seed Data
    const response = await request(app).get("/products?category=Electronics");
    console.log("🚀 ~ it ~ response:", response.body.data[0].Category.name);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("totalProducts");
    expect(response.body).toHaveProperty("totalPages");
    expect(response.body.data).toBeInstanceOf(Array);

    // Ensure all products belong to the requested category
    response.body.data.forEach((product) => {
      expect(product.Category.name).toBe(category);
    });
  });

  it("Berhasil mendapatkan Entitas Utama jumlah data yang sesuai ketika memberikan page tertentu (cek pagination-nya)", async () => {
    const pageNow = 1;
    const limit = 10; // Adjust this to match seeded data
    const response = await request(app).get(
      `/products?page=${pageNow}&limit=${limit}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("currentPage", pageNow);
    expect(response.body).toHaveProperty("size", limit);
    expect(response.body).toHaveProperty("totalProducts");
    expect(response.body).toHaveProperty("totalPages");
    expect(response.body.data).toBeInstanceOf(Array);

    const { currentPage, totalPages, totalProducts, size } = response.body;
    expect(currentPage).toBe(pageNow);
    expect(totalProducts).toBeGreaterThan(0);
    expect(totalPages).toBeGreaterThanOrEqual(1);
    expect(size).toBe(limit);
  });
});

describe("GET /products/:id", () => {
  it("Berhasil mendapatkan 1 Entitas Utama sesuai dengan params id yang diberikan", async () => {
    const response = await request(app).get("/products/1");
    expect(response.status).toBe(200);
    expect(response.body.product).toHaveProperty("id", 1);
  });

  it("Gagal mendapatkan Entitas Utama karena params id yang diberikan tidak ada di database / invalid", async () => {
    const response = await request(app).get("/products/999");
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Product Not Found");
  });
});

describe("POST /login", () => {
  it("should login and return a JWT token", async () => {
    const response = await request(app).post("/login").send({
      email: "user1@mail.com",
      password: "123456",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("access_token");
    expect(typeof response.body.access_token).toBe("string");
  });
});

describe("GET /categories", () => {
  it("should retrieve all categories", async () => {
    const response = await request(app).get("/categories");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBeGreaterThan(0); // Ensure categories are available
  });
});

describe("POST /register", () => {
  it("should register a new user successfully", async () => {
    const newUser = {
      email: "newuser@mail.com",
      password: "password123",
      role: "Customer",
    };

    const response = await request(app).post("/register").send(newUser);
    expect(response.status).toBe(201);
    expect(response.body.message).toBe("User registered successfully");
  });

  it("should fail to register user if required fields are missing", async () => {
    const response = await request(app).post("/register").send({});
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });
});

describe("GET /faqs", () => {
  it("should retrieve all FAQs for authenticated users", async () => {
    const response = await request(app)
      .get("/faqs")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBeGreaterThan(0); // Ensure FAQs exist
  });

  it("should fail to retrieve FAQs for unauthenticated users", async () => {
    const response = await request(app).get("/faqs");
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message", "Invalid token");
  });
});

describe("GET /cart", () => {
  it("should retrieve user's cart (authenticated)", async () => {
    const response = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toBeInstanceOf(Array); // Ensure cart is returned
  });

  it("should fail to retrieve cart for unauthenticated users", async () => {
    const response = await request(app).get("/cart");
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message", "Invalid token");
  });
});

describe("POST /cart", () => {
  it("should add an item to the cart", async () => {
    const response = await request(app)
      .post("/cart")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: 1, quantity: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Product added to cart");
  });

  it("should fail to add an item to the cart for invalid data", async () => {
    const response = await request(app)
      .post("/cart")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: 999, quantity: 0 }); // Invalid productId or quantity
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Invalid data");
  });
});

describe("PUT /cart/:id", () => {
  it("should update an item in the cart", async () => {
    const response = await request(app)
      .put("/cart/1")
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 3 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Cart item updated");
  });

  it("should fail to update the cart item for invalid data", async () => {
    const response = await request(app)
      .put("/cart/999") // Invalid cart ID
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 3 });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Cart item not found");
  });
});

describe("DELETE /cart/:id", () => {
  it("should delete an item from the cart", async () => {
    const response = await request(app)
      .delete("/cart/1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Cart item removed");
  });

  it("should fail to delete a cart item for invalid data", async () => {
    const response = await request(app)
      .delete("/cart/999") // Invalid cart ID
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Cart item not found");
  });
});

describe("POST /orders", () => {
  it("should create a new order", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        cartId: 1, // Assuming a valid cartId is present
        shippingAddress: "123 Street, City, Country",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty(
      "message",
      "Order created successfully"
    );
  });

  it("should fail to create an order if cartId is missing", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        shippingAddress: "123 Street, City, Country",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Cart ID is required");
  });
});

describe("GET /orders/:id", () => {
  it("should fetch an order by ID", async () => {
    const response = await request(app)
      .get("/orders/1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", 1);
  });

  it("should fail if the order ID doesn't exist", async () => {
    const response = await request(app)
      .get("/orders/999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Order not found");
  });
});
