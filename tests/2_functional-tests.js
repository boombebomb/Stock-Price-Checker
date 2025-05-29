const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {
  test('Viewing one stock', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body.stockData, 'stock');
        assert.property(res.body.stockData, 'price');
        assert.property(res.body.stockData, 'likes');
        done();
      });
  });

  test('Viewing one stock and liking it', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG', like: true })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body.stockData, 'likes');
        done();
      });
  });

  test('Viewing two stocks', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'] })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body.stockData);
        assert.property(res.body.stockData[0], 'rel_likes');
        done();
      });
  });

  test('Viewing two stocks and liking them', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'], like: true })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body.stockData);
        assert.property(res.body.stockData[0], 'rel_likes');
        done();
      });
  });

  test('Preventing multiple likes from the same IP', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG', like: true })
      .end(function (err, res) {
        const initialLikes = res.body.stockData.likes;

        chai
          .request(server)
          .get('/api/stock-prices')
          .query({ stock: 'GOOG', like: true })
          .end(function (err, res) {
            assert.equal(res.body.stockData.likes, initialLikes);
            done();
          });
      });
  });

  test('Viewing the same stock and liking it again', function (done) {
    chai
      .request(server)
      .get('/api/stock-prices')
      .query({ stock: 'MSFT', like: true })
      .end(function (err, res) {
        const initialLikes = res.body.stockData.likes;
        chai
          .request(server)
          .get('/api/stock-prices')
          .query({ stock: 'MSFT', like: true })
          .end(function (err, res) {
            assert.equal(res.body.stockData.likes, initialLikes);
            done();
          });
      });
  });
});