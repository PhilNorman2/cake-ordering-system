'use strict';

const orderManager = require('./orderManager');
const kinesisHelper = require('./kinesisHelper');
const cakeProducerManager = require('./cakeProducerManager');
const deliveryCompanyManager = require('./deliveryCompanyManager');
const customerServiceManager = require('./customerServiceManager');

function createResponse(statusCode, message) {
  const response = {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
  return response;
}

module.exports.createOrder = async (event) => {

  const body = JSON.parse(event.body);
  //const body = event;
  const order = orderManager.createOrder(body);

  return orderManager.placeNewOrder(order).then(() => {
    return createResponse(200, order);
  }).catch(error => {
    return createResponse(400, error);
  })
};

module.exports.orderFulfillment = async (event) => {
  const body = JSON.parse(event.body);
  const orderId = body.orderId;
  const fulfillmentId = body.fulfillmentId;

  return orderManager.fulfillOrder(orderId, fulfillmentId).then(() => {
    return createResponse(200, `Order with orderId:${orderId} was sent to delivery`);
  }).catch(error => {
    return createResponse(400, error);
  })
}


module.exports.orderDelivered = async (event) => {

  const body = JSON.parse(event.body);
  const orderId = body.orderId;

  return deliveryCompanyManager.queueDeliveredOrder(orderId, body.deliveryCompanyId, body.orderReview).then(() => {
    return createResponse(200, `Order with orderId:${orderId} was sent to the customer Service Queue`);
  }).catch(error => {
    return createResponse(400, error);
  })
};


module.exports.notifyExternalParties = async (event) => {
  const records = kinesisHelper.getRecords(event);

  const cakeProducerPromise = getCakeProducerPromise(records);
  const deliveryPromise = getDeliveryPromise(records);

  return Promise.all([cakeProducerPromise, deliveryPromise]).then(() => {
    console.log("everythibng went well");
    return 'everything went well'
  }).catch(error => {
    return error;
  })
}

module.exports.notifyDeliveryCompany = async (event) => {
  //Some HTTP call!

  //write message and SQS record content to console

  event.Records.forEach(({messageId, body}) => {
    console.log(`SQS message: ${messageId}` + JSON.stringify(body));
  });

  console.log('Fake call to delivery company endpoint');
  return 'done';
}


module.exports.notifyCustomer = async (event) => {
  //Some HTTP call!

  //write message and SQS record content to console

  event.Records.forEach(({messageId, body}) => {
    console.log(`SQS message: ${messageId} ` + JSON.stringify(body));
  });
  
  console.log(`Fake call to customer service endpoint.`);
  return 'done';
}

function getCakeProducerPromise(records) {
  console.log('--* In getCakeProducerPromise *--');
  const ordersPlaced = records.filter(r => r.eventType === 'order_placed');

  if (ordersPlaced.length > 0) {
    return cakeProducerManager.handlePlacedOrders(ordersPlaced);
  } else {
    return null;
  }
}

function getDeliveryPromise(records) {
  console.log('-*In delivery promise*-');
  const orderFulfilled = records.filter(r => r.eventType === 'order_fulfilled');

  if (orderFulfilled.length > 0) {
    console.log('found order_fulfilled records in stream');
    return deliveryCompanyManager.deliveryOrder(orderFulfilled);
    /*const returnedValue = deliveryCompanyManager.deliveryOrder(orderFulfilled);
    console.log("getDeliveryPromise:returnValue: " + JSON.stringify(returnedValue));
    return returnedValue;*/
  } else {
    console.log('did NOT find order_fulfilled records in stream');
    return null;
  }


}

