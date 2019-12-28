'use strict'

const orderManager = require('./orderManager');
const customerServiceManager = require('./customerServiceManager');

const AWS = require('aws-sdk');
const sqs = new AWS.SQS({
    region: process.env.region
});

const DELIVERY_COMPANY_QUEUE = process.env.deliveryCompanyQueue;

module.exports.deliveryOrder = ordersFulfilled => {
   
    var orderFulfilledPromises = [];

    for (let order of ordersFulfilled) {

        const temp = orderManager.updateOrderForDelivery(order.orderId).then(updatedOrder => 
            {
                return orderManager.saveOrder(updatedOrder).then(saveOrder =>
                    {
                        return notifyDeliveryCompany(updatedOrder);
                    });
            });

        console.log("deliveryOrder: let iteration: temp" + temp);
        orderFulfilledPromises.push(temp);
    };
    console.log ("deliveryOrder:return:orderFulfilledPromises");
    return Promise.all(orderFulfilledPromises);
}

module.exports.queueDeliveredOrder = (orderId, deliveryCompanyId, orderReview) => {

    console.log(`orderId: ${orderId} deliveryCompanyId: ${deliveryCompanyId} orderReview: ${orderReview}`);
    
    return orderManager.updateOrderAfterDelivery(orderId,deliveryCompanyId).then(savedOrder => {
        return orderManager.saveOrder(savedOrder).then(() => {
           return customerServiceManager.notifyCustomerService(orderId, orderReview); 
        });
    });
}

function notifyDeliveryCompany(order) {
    console.log("notifyDeliveryCompany:");
    const params = {
        MessageBody: JSON.stringify(order),
        QueueUrl: DELIVERY_COMPANY_QUEUE
        //QueueURL: 'arn:aws:sqs:us-east-1:994723678627:deliveryServiceQueue'
    };
    console.log("notifyDeliveryCompany:params " + JSON.stringify(params));
    return sqs.sendMessage(params).promise();
}