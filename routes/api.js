'use strict';

// เรียกใช้โมดูล node-fetch สำหรับการเรียก API
const fetch = require('node-fetch');

// เรียกใช้โมดูล crypto สำหรับการเข้ารหัส (hashing)
const crypto = require('crypto');

// อ็อบเจกต์สำหรับเก็บจำนวนไลค์ของแต่ละหุ้น
const stockLikes = {};

// ฟังก์ชันสำหรับทำให้ IP address เป็นข้อมูลนิรนามโดยใช้การเข้ารหัสแบบ SHA256
function anonymizeIp(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// ฟังก์ชันหลักสำหรับกำหนดเส้นทาง API
module.exports = function (app) {
  // กำหนดเส้นทาง GET สำหรับ /api/stock-prices
  app.route('/api/stock-prices').get(async function (req, res) {
    // ดึงค่า stock และ like จาก query parameters
    const { stock, like } = req.query;
    // ดึง IP address ของผู้ใช้
    const ip = req.ip;
    // ทำให้ IP address เป็นข้อมูลนิรนาม
    const anonymizedIp = anonymizeIp(ip);

    try {
      // ตรวจสอบว่ามี stock query parameter หรือไม่
      if (!stock) {
        return res.status(400).json({ error: 'Stock query parameter is required' });
      }

      // ตรวจสอบว่าเป็น array ของหุ้นหรือไม่ ถ้าไม่ใช่ให้แปลงเป็น array
      const stocks = Array.isArray(stock) ? stock : [stock];
      // ดึงข้อมูลราคาหุ้นสำหรับทุกหุ้นที่ร้องขอแบบขนาน
      const stockData = await Promise.all(
        stocks.map(async (symbol) => {
          // เรียก API proxy เพื่อดึงราคาหุ้น
          const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/stock/${symbol}`);
          const data = await response.json();

          // ถ้ายังไม่มีข้อมูลไลค์สำหรับหุ้นนี้ ให้สร้าง Set ใหม่
          if (!stockLikes[symbol]) {
            stockLikes[symbol] = new Set();
          }

          // ถ้า like query parameter เป็น 'true' ให้เพิ่ม IP ที่เป็นนิรนามลงใน Set ของหุ้นนั้น
          if (like === 'true') {
            stockLikes[symbol].add(anonymizedIp);
          }

          // คืนค่าอ็อบเจกต์ที่มี symbol หุ้น ราคา และจำนวนไลค์ทั้งหมด
          return {
            stock: symbol,
            price: data.price,
            likes: stockLikes[symbol].size,
          };
        })
      );

      // ถ้ามีการร้องขอหุ้น 2 ตัว
      if (stocks.length === 2) {
        // คำนวณ relative likes (ผลต่างของไลค์ระหว่างหุ้นทั้งสอง)
        const relLikes = stockData[0].likes - stockData[1].likes;
        // กำหนด rel_likes ให้กับหุ้นตัวแรก
        stockData[0].rel_likes = relLikes;
        // ลบ property 'likes' ออกจากหุ้นตัวแรกตามข้อกำหนด
        delete stockData[0].likes;
        // กำหนด rel_likes ให้กับหุ้นตัวที่สอง (ค่าตรงข้ามกับตัวแรก)
        stockData[1].rel_likes = -relLikes;
        // ลบ property 'likes' ออกจากหุ้นตัวที่สองตามข้อกำหนด
        delete stockData[1].likes;

        // ส่งข้อมูลหุ้นที่เป็น array กลับไป (สำหรับ 2 หุ้น)
        res.json({ stockData: stockData });
      } else {
        // ส่งข้อมูลหุ้นที่เป็นอ็อบเจกต์เดียวกลับไป (สำหรับ 1 หุ้น)
        res.json({ stockData: stockData[0] });
      }
    } catch (error) {
      // จัดการข้อผิดพลาดในการดึงข้อมูล
      res.status(500).json({ error: 'Unable to fetch stock data' });
    }
  });
};