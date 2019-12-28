'use strict'

const uuidv1 = require('uuid/v1');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const kinesis = new AWS.Kinesis();

const TABLE_NAME = process.env.orderTableName;
const STREAM_NAME = process.env.orderStreamName

module.exports.createOrder = body => {
    const order = {
        orderId: uuidv1(),
        name: body.name,
        address: body.address,
        productId: body.productId,
        quantity: body.quantity,
        orderDate: Date.now(),
        eventType: 'order_placed'
    }

    return order;
}

module.exports.placeNewOrder = order => {
    return this.saveOrder(order).then(() => {
        return placeOrderStream(order)
    })
}

module.exports.fulfillOrder = (orderId, fulfillmentId) => {

    // below is for debugging what getOrder returns when sent the orderId

    console.log(`orderId: ${orderId} fulfillmentId: ${fulfillmentId}`);

    const syncOrder = getOrder(orderId);
    syncOrder.then(data => {
        console.log("Query Item succeeded: ", JSON.stringify(data,
            null, 2));
    }).catch(function (err) {
        console.log("Unable to read item. Error JSON: ", JSON.stringify(err, null, 2));
    
    });

    //nested promises to create the fulfill order, getOrder, saveOrder and placeOrderStream
    
    return getOrder(orderId).then(savedOrder => {
        const order = createFulfilledOrder(savedOrder, fulfillmentId);
        return this.saveOrder(order).then(() => {
           return placeOrderStream(order) 
        });
    });
}

module.exports.updateOrderForDelivery = orderId => {
    console.log("-*updateOrderForDelivery*-");
    return getOrder(orderId).then(order => {
        order.sentToDeliveryDate = Date.now();
        console.log("updateOrderForDelivery:order: " + JSON.stringify(order));
        return order;
    });
}

module.exports.updateOrderAfterDelivery = (orderId, deliveryCompanyId) => {
    console.log("updateOrderAfterDelivery");
    return getOrder(orderId).then(order => {
        order.deliveryCompanyId = deliveryCompanyId;
        order.DeliveryDate = Date.now();
        console.log("updatOrderAfterDelivery:order: " + JSON.stringify(order));
        return order;
    });
}

module.exports.saveOrder = order => {
    console.log("-*saveOrder*-");
    console.log("saveOrder:order: " + JSON.stringify(order));
    const params = {
        TableName: TABLE_NAME,
        Item: order
    };
    console.log("saveOrder:params: " + JSON.stringify(params));
    console.log("savedOrder: calling dynamo");
    return dynamo.put(params).promise();
}

function placeOrderStream(order) {
    console.log("in placeOrderStream");
    const params = {
        Data: JSON.stringify(order),
        PartitionKey: order.orderId,
        StreamName: STREAM_NAME
    }
    console.log("placeOrderStream:params: " + JSON.stringify(params));

    return kinesis.putRecord(params).promise();
}

function getOrder(orderId) {
    const params = {
        Key: {
            orderId: orderId
        },
        TableName: TABLE_NAME
    };

    return dynamo.get(params).promise().then(result => {
        return result.Item;
    })
}
  

function createFulfilledOrder(savedOrder, fulfillmentId) {
    savedOrder.fulfillmentId = fulfillmentId;
    savedOrder.fulfillmentDate = Date.now();
    savedOrder.eventType = 'order_fulfilled';

    return savedOrder;
}

function createDeliveredOrder(savedOrder, deliveryCompanyId, orderReview) {
    savedOrder.deliveryCompanyId = deliveryCompanyId;
    savedOrder.orderReview = orderReview;
    savedOrder.deliveryDate = Date.now();
    savedOrder.eventType = 'order_delivered';

    return savedOrder;
}

