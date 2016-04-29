var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'www.kaluli.com'){
            var exp = /product\/(\d*)\.html/ig;
            var res = exp.exec(urlInfo.path);
            var pid = res[1];
        }
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Url Error'
            }
        });
        return '';
    }

    getHtml('http://api.ranshaozhifang.com/nsapi/findSkuByNumber?productId='+pid, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }
        console.log(body);
        //处理
        getItemInfo({
            body:body,
            pid:res[1],
            url:urlStr
         },  callback);
    })

}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pid = params.pid,
        body = params.body,
        url = params.url;
    var itemInfo = {
        Unique: 'cn.kaluli.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: title,
            ShopName : 'kaluli',
            ShopId: 'cn.kaluli'
        },
        Variations: [],
        Items: []
    };

    //未获得信息
    if(!body){
        itemInfo.Status = 'outOfStock';
        callback(null, itemInfo);
        return ;
    }

    body = JSON.parse(body);
    var types = [];                  //类型
    var item =  body.item;
    var title = item.title;
    var itemSkus = item.itemSkus;

    //不存在下架
    if(typeof body.code == 'undefined' || body.code != 'success' || item.status != 3){
        itemInfo.Status = 'outOfStock';
        callback(null, itemInfo);
        return ;
    }


    //数据处理
    _(itemSkus).forEach(function(val){
        if(val.status == 0){
            detail = {
                "Unique":"cn.kaluli."+val.code,
                "Attr":[],
                "Offers": [{
                    "Merchant": {
                        "Name":"kaluli"
                    },
                    "List":[
                        {
                            "Price": val.price,
                            "Type": "RMB"
                        }
                    ]
                }]
            };

            attrs = JSON.parse(val.attr);
            _(attrs).forEach(function(typeKey, type){
                if((typeIndex = _.findIndex(types, {"Name": type})) == -1){
                    types.push({
                        "Id":  types.length+1 ,
                        "Name": type,
                        "Values":[]
                    });

                    typeIndex = types.length-1;
                }

                if((typeDataIndex = _.findIndex(types[typeIndex].Values, {"Name": typeKey})) == -1){
                    types[typeIndex].Values.push({
                        "Id":  types[typeIndex].Values.length+1 ,
                        "Name":typeKey
                    });

                    typeDataIndex = types[typeIndex].Values.length-1;
                }

                detail.Attr.push({
                    "Nid": types[typeIndex].Id,
                    "N":   types[typeIndex].Name,
                    "Vid": types[typeIndex].Values[typeDataIndex].Id,
                    "V":   types[typeIndex].Values[typeDataIndex].Name
                })
            })

            itemInfo.Items.push(detail);
        }
    })

    //没有子商品
    if(itemInfo.Items.length < 1){
        itemInfo.Status = 'outOfStock';
        callback(null, itemInfo);
        return ;
    }

    itemInfo.Variations = types;
    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
    callback(null, itemInfo);
    return ;
}


/*
 *获取html
 **/
function getHtml(urlStr, callback){
    request({
        url: urlStr,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache"
        }
        // proxy: 'http://172.16.15.137:8888'
        //encoding: null
    }, function(error, response, body){
        if(!error && response.statusCode == 200){
            callback(body);
        }else{
            callback(null, error || 'http status not 200');
        }
    })
}