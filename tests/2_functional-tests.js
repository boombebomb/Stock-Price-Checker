const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

/**
 * Functional Tests สำหรับ Stock Price Checker API
 * 
 * การทดสอบครอบคลุม 5 สถานการณ์หลักตามที่โจทย์กำหนด:
 * 1. ดูข้อมูลหุ้น 1 ตัว
 * 2. ดูข้อมูลหุ้น 1 ตัวและไลค์
 * 3. ดูข้อมูลหุ้นเดิมและไลค์อีกครั้ง (ตรวจสอบการป้องกันไลค์ซ้ำ)
 * 4. ดูข้อมูลหุ้น 2 ตัว (เปรียบเทียบ)
 * 5. ดูข้อมูลหุ้น 2 ตัวและไลค์ทั้งคู่
 */
suite('Functional Tests', function () {
  
  // เพิ่มระยะเวลา timeout เพื่อรองรับการเรียก API ภายนอก
  this.timeout(10000);

  /**
   * Test 1: ดูข้อมูลหุ้น 1 ตัว
   * ตรวจสอบว่า API สามารถดึงข้อมูลราคาหุ้นได้ถูกต้อง
   */
  test('Viewing one stock: GET request to /api/stock-prices/', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG' })
      .end(function (err, res) {
        // ตรวจสอบ HTTP status code
        assert.equal(res.status, 200, 'Response status should be 200');
        
        // ตรวจสอบโครงสร้างของข้อมูลที่ตอบกลับ
        assert.isObject(res.body, 'Response body should be an object');
        assert.property(res.body, 'stockData', 'Response should have stockData property');
        
        // ตรวจสอบข้อมูลใน stockData
        const stockData = res.body.stockData;
        assert.isObject(stockData, 'stockData should be an object');
        assert.property(stockData, 'stock', 'stockData should have stock property');
        assert.property(stockData, 'price', 'stockData should have price property');
        assert.property(stockData, 'likes', 'stockData should have likes property');
        
        // ตรวจสอบประเภทข้อมูล
        assert.isString(stockData.stock, 'stock should be a string');
        assert.isNumber(stockData.price, 'price should be a number');
        assert.isNumber(stockData.likes, 'likes should be a number');
        
        // ตรวจสอบค่าที่เฉพาะเจาะจง
        assert.equal(stockData.stock, 'GOOG', 'stock symbol should be GOOG');
        assert.isAtLeast(stockData.likes, 0, 'likes should not be negative');
        
        console.log('Test 1 - Single stock data:', stockData);
        done();
      });
  });

  /**
   * Test 2: ดูข้อมูลหุ้น 1 ตัวและไลค์
   * ตรวจสอบว่าระบบไลค์ทำงานได้ถูกต้อง
   */
  test('Viewing one stock and liking it: GET request to /api/stock-prices/', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG', like: true })
      .end(function (err, res) {
        // ตรวจสอบ HTTP status code
        assert.equal(res.status, 200, 'Response status should be 200');
        
        // ตรวจสอบโครงสร้างข้อมูล
        assert.property(res.body, 'stockData', 'Response should have stockData property');
        assert.property(res.body.stockData, 'stock', 'stockData should have stock property');
        assert.property(res.body.stockData, 'price', 'stockData should have price property');
        assert.property(res.body.stockData, 'likes', 'stockData should have likes property');
        
        // ตรวจสอบว่าจำนวนไลค์เป็นจำนวนบวก (อย่างน้อย 1 จากการไลค์ที่เพิ่งทำ)
        assert.isAtLeast(res.body.stockData.likes, 1, 'likes should be at least 1 after liking');
        
        console.log('Test 2 - Stock data with like:', res.body.stockData);
        done();
      });
  });

  /**
   * Test 3: ป้องกันการไลค์ซ้ำจาก IP เดียวกัน
   * ตรวจสอบว่าไม่สามารถไลค์หุ้นเดียวกันได้มากกว่า 1 ครั้งจาก IP เดียวกัน
   */
  test('Viewing the same stock and liking it again: GET request to /api/stock-prices/', function (done) {
    // การร้องขอครั้งแรก - ไลค์หุ้น MSFT
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: 'MSFT', like: true })
      .end(function (err, res) {
        const initialLikes = res.body.stockData.likes;
        console.log('Test 3 - Initial likes for MSFT:', initialLikes);
        
        // การร้องขอครั้งที่สอง - ไลค์หุ้น MSFT อีกครั้ง (จาก IP เดียวกัน)
        chai
          .request(server)
          .get('/api/stock-prices')
          .query({ stock: 'MSFT', like: true })
          .end(function (err, res) {
            // จำนวนไลค์ควรจะเท่าเดิม (ไม่เพิ่มขึ้น)
            assert.equal(
              res.body.stockData.likes, 
              initialLikes, 
              'Likes should not increase when same IP likes again'
            );
            
            console.log('Test 3 - Likes after second attempt:', res.body.stockData.likes);
            done();
          });
      });
  });

  /**
   * Test 4: ดูข้อมูลหุ้น 2 ตัว (เปรียบเทียบ)
   * ตรวจสอบว่า API สามารถเปรียบเทียบหุ้น 2 ตัวได้และแสดง relative likes
   */
  test('Viewing two stocks: GET request to /api/stock-prices/', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'] })
      .end(function (err, res) {
        // ตรวจสอบ HTTP status code
        assert.equal(res.status, 200, 'Response status should be 200');
        
        // ตรวจสอบโครงสร้างข้อมูล
        assert.property(res.body, 'stockData', 'Response should have stockData property');
        assert.isArray(res.body.stockData, 'stockData should be an array for two stocks');
        assert.lengthOf(res.body.stockData, 2, 'stockData array should have 2 elements');
        
        // ตรวจสอบข้อมูลหุ้นตัวแรก
        const firstStock = res.body.stockData[0];
        assert.property(firstStock, 'stock', 'First stock should have stock property');
        assert.property(firstStock, 'price', 'First stock should have price property');
        assert.property(firstStock, 'rel_likes', 'First stock should have rel_likes property');
        assert.notProperty(firstStock, 'likes', 'First stock should not have likes property (only rel_likes)');
        
        // ตรวจสอบข้อมูลหุ้นตัวที่สอง
        const secondStock = res.body.stockData[1];
        assert.property(secondStock, 'stock', 'Second stock should have stock property');
        assert.property(secondStock, 'price', 'Second stock should have price property');
        assert.property(secondStock, 'rel_likes', 'Second stock should have rel_likes property');
        assert.notProperty(secondStock, 'likes', 'Second stock should not have likes property (only rel_likes)');
        
        // ตรวจสอบว่า rel_likes ของทั้งสองหุ้นเป็นค่าตรงข้ามกัน
        assert.equal(
          firstStock.rel_likes + secondStock.rel_likes, 
          0, 
          'Sum of rel_likes should be 0'
        );
        
        // ตรวจสอบประเภทข้อมูล
        assert.isNumber(firstStock.rel_likes, 'rel_likes should be a number');
        assert.isNumber(secondStock.rel_likes, 'rel_likes should be a number');
        
        console.log('Test 4 - Two stocks comparison:', res.body.stockData);
        done();
      });
  });

  /**
   * Test 5: ดูข้อมูลหุ้น 2 ตัวและไลค์ทั้งคู่
   * ตรวจสอบว่าการไลค์หุ้น 2 ตัวพร้อมกันทำงานได้ถูกต้อง
   */
  test('Viewing two stocks and liking them: GET request to /api/stock-prices/', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'], like: true })
      .end(function (err, res) {
        // ตรวจสอบ HTTP status code
        assert.equal(res.status, 200, 'Response status should be 200');
        
        // ตรวจสอบโครงสร้างข้อมูล
        assert.property(res.body, 'stockData', 'Response should have stockData property');
        assert.isArray(res.body.stockData, 'stockData should be an array for two stocks');
        assert.lengthOf(res.body.stockData, 2, 'stockData array should have 2 elements');
        
        // ตรวจสอบข้อมูลหุ้นทั้งสอง
        const firstStock = res.body.stockData[0];
        const secondStock = res.body.stockData[1];
        
        // ตรวจสอบว่าทั้งสองมี rel_likes และไม่มี likes
        assert.property(firstStock, 'rel_likes', 'First stock should have rel_likes');
        assert.property(secondStock, 'rel_likes', 'Second stock should have rel_likes');
        assert.notProperty(firstStock, 'likes', 'First stock should not have likes property');
        assert.notProperty(secondStock, 'likes', 'Second stock should not have likes property');
        
        // ตรวจสอบว่า rel_likes เป็นค่าตรงข้ามกัน
        assert.equal(
          firstStock.rel_likes + secondStock.rel_likes, 
          0, 
          'Sum of rel_likes should be 0 even after liking both'
        );
        
        // ตรวจสอบข้อมูลพื้นฐาน
        assert.isString(firstStock.stock, 'stock symbol should be string');
        assert.isString(secondStock.stock, 'stock symbol should be string');
        assert.isNumber(firstStock.price, 'price should be number');
        assert.isNumber(secondStock.price, 'price should be number');
        
        console.log('Test 5 - Two stocks with likes:', res.body.stockData);
        done();
      });
  });

  /**
   * Additional Test: ทดสอบกรณี Error Handling
   * ตรวจสอบว่า API จัดการข้อผิดพลาดได้อย่างเหมาะสม
   */
  test('Error handling - Missing stock parameter', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({}) // ไม่ส่ง stock parameter
      .end(function (err, res) {
        // ควรได้ HTTP status code 400 (Bad Request)
        assert.equal(res.status, 400, 'Should return 400 for missing stock parameter');
        assert.property(res.body, 'error', 'Should return error message');
        assert.isString(res.body.error, 'Error should be a string');
        
        console.log('Error handling test - Missing parameter:', res.body);
        done();
      });
  });

  /**
   * Additional Test: ทดสอบการป้องกันไลค์ซ้ำสำหรับหุ้นตัวเดียวกัน
   * เป็นการทดสอบเพิ่มเติมเพื่อความมั่นใจในระบบป้องกันไลค์ซ้ำ
   */
  test('Preventing multiple likes from the same IP', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: 'AAPL', like: true })
      .end(function (err, res) {
        const initialLikes = res.body.stockData.likes;
        
        // พยายามไลค์อีกครั้งจาก IP เดียวกัน
        chai
          .request(server)
          .get('/api/stock-prices')
          .query({ stock: 'AAPL', like: true })
          .end(function (err, res) {
            // จำนวนไลค์ควรเท่าเดิม
            assert.equal(
              res.body.stockData.likes, 
              initialLikes,
              'Should prevent multiple likes from same IP'
            );
            
            console.log('Duplicate like prevention test passed');
            done();
          });
      });
  });
});