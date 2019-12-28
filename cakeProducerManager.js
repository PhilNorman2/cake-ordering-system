'use strict'

const AWS = require('aws-sdk');
const ses = new AWS.SES({
    region: process.env.region
});

const CAKE_PRODUCER_EMAIL = process.env.cakeProducerEmail;
const ORDERING_SYSTEM_EMAIL = process.env.orderSystemEmail;

module.exports.handlePlacedOrders = ordersPlaced => {
    var ordersPlacedPromises = [];
    console.log("handlePlacedOrders:ordersPlaced:length: " + ordersPlaced.length);

    for (let order of ordersPlaced) {
        const temp = notifyCakeProducerByEmail(order);
        ordersPlacedPromises.push(temp);
    }

    return Promise.all(ordersPlacedPromises);
}

function notifyCakeProducerByEmail(order) {
    console.log("in notifyCakeProducerByEmail");
    const params = {
        Destination: {
            ToAddresses: [CAKE_PRODUCER_EMAIL]
        },
        Message: {
            Body: {
                Text: {
                    Data: JSON.stringify(order)
                }
            },
            Subject: {
                Data: 'New cake order'
            }
        },
        Source: ORDERING_SYSTEM_EMAIL
    };
    console.log("notifyCakeProducerByEmail:params: " + JSON.stringify(params));
    return ses.sendEmail(params).promise().then((data) => {
        console.log("data: " + JSON.stringify(data));
        return data;
    });
}
