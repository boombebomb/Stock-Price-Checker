'use strict';
// เรียกใช้โมดูล dotenv เพื่อโหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
require('dotenv').config();

// เรียกใช้โมดูล express เพื่อสร้างเว็บแอปพลิเคชัน
const express = require('express');

// เรียกใช้โมดูล body-parser สำหรับแยกวิเคราะห์ body ของ request
const bodyParser = require('body-parser');

// เรียกใช้โมดูล cors สำหรับเปิดใช้งาน Cross-Origin Resource Sharing
const cors = require('cors');

// เรียกใช้โมดูล helmet เพื่อเพิ่มความปลอดภัยให้กับแอปพลิเคชัน
const helmet = require('helmet');

// เรียกใช้ไฟล์ routes สำหรับ API
const apiRoutes = require('./routes/api.js');

// เรียกใช้ไฟล์ routes สำหรับ FCC testing
const fccTestingRoutes  = require('./routes/fcctesting.js');

// เรียกใช้ไฟล์ test-runner
const runner = require('./test-runner');

// สร้าง instance ของ express application
const app = express();

// กำหนดให้โฟลเดอร์ public สามารถเข้าถึงได้แบบ static
app.use('/public', express.static(process.cwd() + '/public'));

// เปิดใช้งาน CORS สำหรับการทดสอบของ FCC เท่านั้น
app.use(cors({origin: '*'})); //For FCC testing purposes only

// ตั้งค่า body-parser สำหรับการแยกวิเคราะห์ JSON และ URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// เส้นทางสำหรับหน้า Index (HTML static)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// เรียกใช้ routes สำหรับ FCC testing
fccTestingRoutes(app);

// เรียกใช้ routes สำหรับ API
apiRoutes(app);

// Middleware สำหรับจัดการข้อผิดพลาด 404 Not Found
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// ใช้ Helmet เพื่อเพิ่มความปลอดภัยให้กับแอปพลิเคชัน
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
    },
  })
);

// ป้องกัน clickjacking โดยการตั้งค่า X-Frame-Options เป็น DENY
app.use(helmet.frameguard({ action: 'deny' }));

// ป้องกัน XSS attacks โดยการเพิ่ม HTTP headers
app.use(helmet.xssFilter());

// ป้องกันการดมกลิ่น MIME type โดยการตั้งค่า X-Content-Type-Options เป็น nosniff
app.use(helmet.noSniff());

// ป้องกันการ prefetch DNS
app.use(helmet.dnsPrefetchControl());

// ซ่อน X-Powered-By header และตั้งค่าเป็น 'PHP 7.4' เพื่อปกปิดเทคโนโลยีที่ใช้
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4' }));

// เริ่มต้น server และทำการทดสอบ
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  // ถ้าอยู่ในโหมดทดสอบ ให้ทำการ run tests
  if(process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch(e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 3500);
  }
});

// ส่งออก app สำหรับการทดสอบ
module.exports = app;
