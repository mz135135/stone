var express = require('express'), app = express();
var url = require('url');
var request = require('request');


var taobao = require('./lib/shop/taobaoShop');
var nikeStore = require('./lib/shop/nikeShop');
var amazoncnStore = require('./lib/shop/amazoncnShop');
var duStore = require('./lib/shop/duShop');
var searchJdStore = require('./lib/shop/searchJdShop');
var jdStore = require('./lib/shop/jdShop');
var kaolaStore = require('./lib/shop/kaolaShop');
var vipStore = require('./lib/shop/vipShop');
var farfetch = require('./lib/shop/farfetchShop');
var stockx = require('./lib/shop/stockxShop');
var tmall = require('./lib/shop/tmallShop');
var adidas = require('./lib/shop/adidasShop')

app.get('/t',function(req,res){
    taobao.getInfo('https://auxdq.tmall.com',1,function(error,itemInfo){
        if(error){
            res.send(error);
        }else{
            res.send(itemInfo);
        }
    })
})

app.get('/info', function (req, res) {
    var goodsUrl = req.query.url;
    var page = 1;
    var goodsUrlHost = '';
    if(goodsUrl){
        var urlInfo = url.parse(goodsUrl, true, true);
        goodsUrlHost = urlInfo.host;
        page = req.query.page ?Number(req.query.page):Number(urlInfo.query.page);
    }
    var storeObj = getStoreObj(goodsUrlHost);
    if(typeof storeObj == 'object'){
        storeObj.getInfo(goodsUrl , page, function(error, itemInfo){
            if(error){
                res.json({
                    Status: false,
                    Msg: error
                })
            }else{
                res.json({ Status: true, Data: itemInfo});
            }
        })
    }else{
        res.json({
            Status: false,
            Msg: {
                Errors: [{
                    Code: '请求地址不在抓取访问',
                    Message: '请求地址不在抓取访问'
                }]
            }
        })
    }
})

//获取商城对象
function getStoreObj(host){
    if (host.indexOf('nike.com') > 0){
        return nikeStore;
    }else if(host.indexOf('amazon.cn') > 0){
        return amazoncnStore;
    }else if(host == 'du.hupu.com'){
        return duStore;
    }else if(host.indexOf('search.jd')>= 0){
        return searchJdStore;
    }else if(host.indexOf('jd.com') > 0 || host.indexOf('jd.hk') > 0){
        return jdStore;
    }else if(host.indexOf('kaola.com') > 0){
        return kaolaStore;
    }else if(host.indexOf('vip.com') > 0){
        return vipStore;
    }else if(host.indexOf('farfetch.com') > 0){
        return farfetch;
    }else if(host.indexOf('stockx.com') >= 0){
        return stockx;
    }else if(host.indexOf('list.tmall') >= 0){
        return tmall;
    }else if(host.indexOf('adidas.tmall.com') >= 0){
        return adidas;
    }
    return taobao;

}

app.listen(3002);