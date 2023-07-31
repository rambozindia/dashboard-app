// index.js
const express = require("express");
const mongoose = require("mongoose");
// const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/ywait_stg_insta_gcc", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// app.use(bodyParser.json());

// Implement the API to fetch booking details on a particular date
app.get("/bookings", async (req, res) => {
  try {
    const { user_id, business_id, date } = req.query;
    const db = mongoose.connection.db;
    const bookingsCollection = db.collection('bookings');

    const startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setUTCHours(23, 59, 59, 999);

    const bookings = await bookingsCollection.find({
      customer_id: new mongoose.Types.ObjectId(user_id),
      business_id: new mongoose.Types.ObjectId(business_id),
      dateFrom: { $gte: startDate, $lte: endDate },
    }).toArray();

    const totalBookings = bookings.length;
    const newCustomersCount = bookings.filter(booking => booking.isNoPreference).length;
    const walkinCustomersCount = bookings.filter(booking => booking.services.length === 0).length;
    const cancelledBookingsCount = bookings.filter(booking => booking.status === 'CANCELLED').length;
    const noShowBookingsCount = bookings.filter(booking => booking.status === 'NOSHOW').length;
    // You might have a separate schema for consultants, and you can query their availability based on the date.

    res.json({
      totalBookings,
      newCustomersCount,
      walkinCustomersCount,
      cancelledBookingsCount,
      noShowBookingsCount,
      availableConsultants: [], // Implement your logic here to get available consultants.
    });

  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
