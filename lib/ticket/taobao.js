var request = require('request');
var _ = require('lodash');
var url = require('url');
var md5 = require('md5');
var Q = require('q');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var fs = require('fs');
var runList = require('./runList.js');

exports.getInfo = function(activityId,  itemId, sellerId, key, callback) {
    if (activityId || key) {
        getItemInfo(activityId, itemId, sellerId, key, callback);
    } else {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
    }
}

function getItemInfo(activityId, itemId, sellerId, key, callback){
    if(activityId && itemId){
        var apiUrl = 'https://uland.taobao.com/cp/coupon?ctoken=&activityId='+activityId+'&pid=&itemId='+itemId;
    }else if(key){
        var apiUrl = 'https://uland.taobao.com/cp/coupon?e='+key+'&pid=mm_33231688_7050284_23466709';
    }else{
        getItemInfoAll(activityId, sellerId, callback);
        return;
    }

     proxyRequest({url:apiUrl}, function (error, body) {
        try {
            var body = JSON.parse(body)
            if(!body.success) {
                callback({
                    "Errors":{'Code': 'Error', "Message": '请求接口失败'}
                });
                return;
            }

            var itemInfo = {
                Status: false,
                IsAlimama : false,
                Coupon: {
                    List: [],
                }
            };

            if( body.result.retStatus == 0){ //粉丝福利购请求ok
                result = body.result;

                coupon = {
                    Id : key ? key : activityId,
                    Amount : [result.amount, result.startFee],
                    Date: [result.effectiveStartTime,  result.effectiveEndTime],
                    Category : key ? 'key' : 'normal'
                };

                itemInfo.IsAlimama = true;
                itemInfo.Status = true;
                itemInfo.Coupon.List.push(coupon);
                itemInfo.Md5 = md5(JSON.stringify(itemInfo))
                callback(null, itemInfo);
                return ;
            }else{
                if(activityId && sellerId){ //普通优惠券地址
                    getItemInfoAll(activityId, sellerId, callback);
                }else{
                    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                    callback(null, itemInfo);
                    return ;
                }
            }
        }catch(exception){
            callback({
                "Errors":{'Code': 'Error', "Message": exception}
            });
            return;
        }
    })
}

//获取所有包含activityid的优惠券信息
function getItemInfoAll(activityId, sellerId, callback){
    var apiUrl = 'http://121.43.104.86:3001/?activity_id='+activityId+'&seller_id='+sellerId;

    proxyRequest({url:apiUrl}, function (error, body) {
        try {
            var body = JSON.parse(body)
            if(body.status != 200) {
                callback({
                    "Errors":{
                        'Code': 'Wait',
                        "Message": body.msg
                    }
                });
                return;
            }

            var itemInfo = {
                Status: false,
                IsAlimama : false,
                Coupon: {
                    List: [],
                }
            };

            var data = body.data;
            if( data.length >  0){
                data = data[0];

                coupon = {
                    Id : activityId,
                    Amount : [Number(data.discount) / 100 , Number(data.startFee) / 100],
                    Date: [data.startTime,  data.endTime],
                    Category : 'normal'
                };
                itemInfo.Coupon.List.push(coupon);
            }

            if(itemInfo.Coupon.List.length > 0) {
                itemInfo.Status = true;
            }
            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            callback(null, itemInfo);
            return ;
        }catch(exception){
            callback({
                "Errors":{'Code': 'Error', "Message": exception}
            });
            return;
        }
    })
}

/*
 *获取html
 **/
var maxRequestNum = 2;
var requestNum = 0;
function proxyRequest(options, callback){
    options.headers = {};
    options.headers['refer'] = 'https://auxdq.m.tmall.com/shop/shop_auction_search.htm?spm=a320p.7692171.0.0&suid=1035757927&sort=d';
    options.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
    options.headers['Accept-Encoding'] = "deflate, sdch";
    options.headers['Accept-Language'] = "zh-CN,zh;q=0.8";
    options.headers['Cookie'] = "cna=fR+hDeeT50ICATr3cloaZbmD; miid=6345998908287345826; x=e%3D1%26p%3D*%26s%3D0%26c%3D0%26f%3D0%26g%3D0%26t%3D0%26__ll%3D-1%26_ato%3D0; lzstat_uv=8629291913329613887|2144678; tracknick=hxl724753832; _cc_=VT5L2FSpdA%3D%3D; tg=0; thw=cn; v=0; cookie2=1c7bbf9e1215cb87b08ec21f399c6498; t=17cb7c33aba0dc662a5d8eb53fdf6401; uc1=cookie14=UoWxMPWZEssQOQ%3D%3D; _tb_token_=qJoDmUMIJFXz9c3; mt=ci%3D-1_0; l=Ajg4Vmc1KX4VL9QVWo/j-16oiOjKoZwr";

    request(options,function(error,response,body) {
        // console.log(error)
        if (!error && response.statusCode == 200) {
            callback(null, body, response);
        }else{
            callback(error, null, null);
        }
    })
}