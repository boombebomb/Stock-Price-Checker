'use strict';

// เรียกใช้โมดูล dotenv เพื่อโหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
require('dotenv').config();

// เรียกใช้โมดูลหลักสำหรับสร้างเว็บแอปพลิเคชัน
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');

// เรียกใช้ไฟล์ routes สำหรับ API และการทดสอบ
const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

// สร้าง Express application instance
const app = express();

// ===========================================
// MIDDLEWARE CONFIGURATION
// ===========================================

// ตั้งค่าให้โฟลเดอร์ public สามารถเข้าถึงได้แบบ static files
app.use('/public', express.static(process.cwd() + '/public'));

// เปิดใช้งาน CORS สำหรับการทดสอบของ FCC
// ในโปรเจคจริงควรจำกัด origin เพื่อความปลอดภัย
app.use(cors({ origin: '*' })); // For FCC testing purposes only

// ตั้งค่า body-parser สำหรับการแยกวิเคราะห์ request body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===========================================
// SECURITY CONFIGURATION
// ===========================================

// ใช้ Helmet เพื่อเพิ่มความปลอดภัยให้กับแอปพลิเคชัน

// Content Security Policy - ควบคุมแหล่งที่มาของ resources
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"], // อนุญาตเฉพาะ resources จาก origin เดียวกัน
      scriptSrc: ["'self'"],  // อนุญาต scripts จาก origin เดียวกันเท่านั้น
      styleSrc: ["'self'"],   // อนุญาต styles จาก origin เดียวกันเท่านั้น
    },
  })
);

// ป้องกัน clickjacking โดยการตั้งค่า X-Frame-Options เป็น DENY
// ป้องกันไม่ให้เว็บไซต์ถูกฝังใน iframe ของเว็บไซต์อื่น
app.use(helmet.frameguard({ action: 'deny' }));

// ป้องกัน XSS attacks โดยการเพิ่ม X-XSS-Protection header
// เปิดใช้งาน built-in XSS filter ของเบราว์เซอร์
app.use(helmet.xssFilter());

// ป้องกันการ MIME type sniffing โดยการตั้งค่า X-Content-Type-Options เป็น nosniff
// บังคับให้เบราว์เซอร์เคารพ Content-Type header ที่กำหนด
app.use(helmet.noSniff());

// ป้องกันการ DNS prefetching ที่ไม่จำเป็น
// ช่วยป้องกันการรั่วไหลของข้อมูล DNS
app.use(helmet.dnsPrefetchControl());

// ซ่อน X-Powered-By header และตั้งค่าปลอมเป็น 'PHP 7.4'
// เพื่อปกปิดเทคโนโลยีที่ใช้จริง (Express.js)
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4' }));

// ===========================================
// TRUST PROXY CONFIGURATION
// ===========================================

// ตั้งค่าให้ Express trust proxy เพื่อให้ได้ IP address ที่ถูกต้อง
// สำคัญสำหรับการทำงานของระบบไลค์ที่ต้องตรวจสอบ IP
app.set('trust proxy', true);

// ===========================================
// ROUTE HANDLERS
// ===========================================

// เส้นทางสำหรับหน้าแรก (Index page)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// เรียกใช้ routes สำหรับการทดสอบของ FCC
fccTestingRoutes(app);

// เรียกใช้ routes สำหรับ API หลัก
apiRoutes(app);

// ===========================================
// ERROR HANDLING
// ===========================================

// Middleware สำหรับจัดการข้อผิดพลาด 404 Not Found
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Global error handler
app.use(function(err, req, res, next) {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Internal server error' 
  });
});

// ===========================================
// SERVER STARTUP
// ===========================================

// เริ่มต้น server และกำหนด port
const PORT = process.env.PORT || 3000;
const listener = app.listen(PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  // ถ้าอยู่ในโหมดทดสอบ ให้รัน tests โดยอัตโนมัติ
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 3500); // รอ 3.5 วินาทีให้ server เริ่มต้นเสร็จสมบูรณ์
  }
});

// ===========================================
// GRACEFUL SHUTDOWN
// ===========================================

// จัดการการปิด server อย่างสุภาพ
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  listener.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  listener.close(() => {
    console.log('Process terminated');
  });
});

// จัดการ unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

// จัดการ uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log('Uncaught Exception:', error);
  process.exit(1);
});

// ส่งออก app สำหรับการทดสอบ
module.exports = app;