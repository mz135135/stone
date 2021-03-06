var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var eventproxy = require('eventproxy')

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'item.gome.com.cn'){
            var exp = /\/([0-9A-Za-z]+)-([0-9A-Za-z]+)\.html/ig;
            var res = exp.exec(urlInfo.path);
            var gid = res[1];
            var sid = res[2];
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

    //http://item.m.gome.com.cn/product-9134401079-1123340507.html
    var m_url ="https://item.m.gome.com.cn/product-"+gid+"-"+sid+".html";
    getHtml(m_url, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        getItemInfo({body:body, gid:gid, sid:sid, url:urlStr},  callback);
    })

}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var sid = params.sid,
        body = params.body,
        gid = params.gid,
        url = params.url;

    try{
        var exp = /var\s*gData\s*=\s*(\{.*\});/ig;
        body = exp.exec(body);

        if (body.length < 2){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'get detail error'
                }
            });
            return '';
        }
        body = JSON.parse(body[1]);
    } catch (exception) {
        console.log(exception)
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": exception.message
            }
        });
        return '';
    }

    var itemInfo = {
        Unique: 'cn.gome.' + gid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: '',
            ShopName : '国美',
            ShopId: '',
            ImageUrl: '',
            VenderType:'自营',
            StageInfo:''
        },
        Variations: [],
        Items: [],
        coupon:''
    };


    if(typeof body.goods == undefined){//未获得信息
        itemInfo.Status = 'notFind'
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return '';
    }
    itemInfo.ItemAttributes.Title    =   body.goods.name;
    itemInfo.ItemAttributes.ImageUrl =   'http:'+body.skuImg[body.skuID];
    itemInfo.ItemAttributes.ShopId   =  'cn.gome';

    var priceSkus=[];
    var items = [];
    var attrArr = [];
    var Variations = [];
    var colorSkus=[];

    try{
        if (body.goods.shopName != '国美自营'){
                itemInfo.ItemAttributes.ShopName = body.goods.shopName;
        }
        if (body.isShop != 0){
             itemInfo.ItemAttributes.VenderType = '普通';
        }
            
        //单属性
        if (body.attr.attrList.salesPropertyList.length == 0){
            var item = {
                "Unique":"cn.gome."+gid+'_'+body.skuID,
                "Attr":[],
                "Offers": [{
                    "Merchant": {
                        "Name":"gome"
                    },
                    "List":[
                        {
                            "Price": 0,
                            "Type": "RMB"
                        }
                    ],
                    "Subtitle":[]
                }]
            };


            var wap_url = "https://item.m.gome.com.cn/product/stock?goodsNo="+gid+"&skuID="+body.skuID+"&shopId=&shopType=&provinceId=11000000&cityId=11010000&districtId=11010200&townId=110102002&modelId=&stid=&mid=&isFirst=Y&isPresent=0&ajax=1&_="+new Date().getTime();
                getHtml(wap_url, function(bodyPrices, err){
                    if(err){
                        callback({
                            "Errors":{
                                'Code': 'Error',
                                "Message": err
                            }
                        });
                        return '';
                    }
                    try{
                        bodyPrices = JSON.parse(bodyPrices);
                        if(bodyPrices.stock.state == 1 && bodyPrices.stock.skuPrice){
                            item.Offers[0].List[0].Price = bodyPrices.stock.skuPrice;
                            //获取价格
                            itemInfo.Items.push(item);

                            //获取促销信息
                            if (bodyPrices.stock.adDescIndex){
                                var dd=bodyPrices.stock.adDescIndex.replace(/<.+?>.*<\/?.+?>/g,"");
                                var tmp_subtitle=dd.replace(/ /g,"");
                                item.Offers[0].Subtitle.push({Name:tmp_subtitle})
                            }

                            if (bodyPrices.prom.list){
                                bodyPrices.prom.list.forEach(function(prom){
                                    if (prom.tag == '满额立减'){
                                        item.Offers[0].Subtitle.push({Name:prom.desc.replace(/\,/g,'')});
                                    }
                                })
                            }

                            //返回数据
                            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                            callback(null, itemInfo);
                            return ;
                        } else {
                            itemInfo.Status = 'outOfStock';//没货
                            //返回数据
                            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                            callback(null, itemInfo);
                        }

                    }catch(e){
                        callback(null, bodyPrices);
                        return '';
                    }
                },'application/json','XMLHttpRequest','https://item.m.gome.com.cn/product-'+gid+'-'+body.skuID+'.html');
        } else {//多属性
            //循环attr
            body.attr.attrList.salesPropertyList.forEach(function(val,key){
                var attrTmp = {
                    'Id' : key+1,
                    'Name':val.attrName,
                    "Values":[]
                };
                val.attrList.forEach(function(aval,akey){
                    if (val.attrName == '颜色'){
                        attrTmp.Values.push({
                            "ValueId": 'v'+(key+1)+(akey+1),
                            "Name": aval.title,
                            "ImageUrls": []
                        });
                    } else {
                        attrTmp.Values.push({
                            "ValueId": 'v'+(key+1)+(akey+1),
                            "Name": aval.title,
                        });
                    }
                })
                attrArr.push(val.attrName);
                Variations[val.attrName] = attrTmp;
            })

            //获取sku
            body.attr.attrList.skuList.forEach(function(val){
                var item = {
                    "Unique":"cn.gome."+gid+'_'+val.skuID,
                    "Attr":[],
                    "Offers": [{
                        "Merchant": {
                            "Name":"gome"
                        },
                        "List":[
                            {
                                "Price": 0,
                                "Type": "RMB"
                            }
                        ],
                        "Subtitle":[]
                    }]
                };

                val.attributeList.forEach(function(sval,skey){
                    if((attrIndex = _.findIndex(Variations[sval.saName].Values, {"Name":sval.saValue})) != -1){
                        item.Attr.push({
                            "Nid": skey+1,
                            "N":   sval.saName,
                            "Vid": Variations[sval.saName].Values[attrIndex].ValueId,
                            "V":   sval.saValue 
                        })
                        //存储需要抓取图片的颜色
                        if(sval.saName == '颜色' && _.findIndex(colorSkus, {"name":sval.saValue}) == -1){
                            colorSkus.push({
                                "name": sval.saValue,
                                "skuid": val.skuID
                            });
                        }
                    }
                })

                //保存商品信息
                items.push(item);
                priceSkus.push(val.skuID);
            })

            var itemAttr = [];//有货的属性组合

             var length = priceSkus.length + colorSkus.length + 1;

             var ep = new eventproxy();
             ep.after('priceSkus', length, function (priceSkusItems) {
                priceSkusItems.forEach(function(priceSkusItem){
                    if (priceSkusItem[0] == 'price'){
                        if((itemIndex = _.findIndex(items, {"Unique": "cn.gome."+gid+'_'+ priceSkusItem[1][0]})) != -1){
                            if(priceSkusItem[1][1].stock.state == 1 && priceSkusItem[1][1].stock.skuPrice){
                                items[itemIndex].Offers[0].List[0].Price = priceSkusItem[1][1].stock.skuPrice;

                                //获取促销信息
                                if (priceSkusItem[1][1].stock.adDescIndex){
                                    var dd=priceSkusItem[1][1].stock.adDescIndex.replace(/<.+?>.*<\/?.+?>/g,"");
                                    var tmp_subtitle=dd.replace(/ /g,"");
                                    items[itemIndex].Offers[0].Subtitle.push({Name:tmp_subtitle})
                                }

                                if (priceSkusItem[1][1].prom.List != undefined && priceSkusItem[1][1].prom.list.length>0){
                                    priceSkusItem[1][1].prom.list.forEach(function(prom){
                                        if (prom.tag == '满额立减'){
                                            items[itemIndex].Offers[0].Subtitle.push({Name:prom.desc.replace(/\,/g,'')});
                                        }
                                    })
                                }
                                //记录有价格的商品的属性
                                items[itemIndex].Attr.forEach(function(tmpAttr){
                                    if (!itemAttr[tmpAttr.Nid]){
                                        itemAttr[tmpAttr.Nid] = [];
                                    }
                                    itemAttr[tmpAttr.Nid].push(tmpAttr);
                                })
                            }
                        }
                    } else if(priceSkusItem[0] == 'image') {
                        if((colorSkuIndex = _.findIndex(colorSkus, {"skuid":priceSkusItem[1].skuID})) != -1){
                            if((colorIndex = _.findIndex(Variations['颜色'].Values, {"Name":colorSkus[colorSkuIndex].name})) != -1){
                                var ImageUrls = [];
                                priceSkusItem[1].goods.goods_img.forEach(function(val,key){
                                    if (key<5){
                                        Variations['颜色'].Values[colorIndex].ImageUrls.push('http:'+val);
                                    }
                                })
                            }
                        }
                    } else {//券
                        if (priceSkusItem[1].ticket != undefined && priceSkusItem[1].ticket.list != undefined){
                            if(priceSkusItem[1].ticket.list.length>0){
                                itemInfo.Coupon = {"List": []};
                                priceSkusItem[1].ticket.list.forEach(function(coupon){
                                    var quota = coupon.desc.replace(/满/g, "");
                                    var couponPrice = quota.split("减");
                                    var couponDate = coupon.date.replace(/使用期限：/g,'');
                                    var couponDateArr = couponDate.split("-");
                                    if (couponPrice.length > 1){
                                        itemInfo.Coupon.List.push({
                                            "Id":coupon.code,
                                            "Amount":[coupon.price, couponPrice[0]],
                                            "Date":[couponDateArr[0].replace(/\./g,"-")+' 00:00:00', couponDateArr[1].replace(/\./g, "-")+' 59:59:59'],
                                            "Category": "normal",
                                            "Type": "item"
                                        });
                                    }
                                    
                                })
                                if (itemInfo.Coupon.List.length == 0){
                                    //itemInfo.Coupon = '';
                                }
                            }
                        }
                    }
                })

                //只获取价格存在的
                items.forEach(function(item){
                    if (item.Offers[0].List[0].Price > 0){
                        itemInfo.Items.push(item);
                    }
                });
                
                 //返回数据 去掉无货的属性
                 if (attrArr.length > 0 && itemInfo.Items.length > 0){
                    attrArr.forEach(function(attr){
                        var newAttrArr = {};
                        var newAttr = Variations[attr];
                        newAttrArr.Id = newAttr.Id;
                        newAttrArr.Name = newAttr.Name;
                        newAttrArr.Values = [];
                        newAttr.Values.forEach(function(newAttrVal){
                            if((newAttrArrIndex = _.findIndex(itemAttr[newAttr.Id], {"Vid": newAttrVal.ValueId})) != -1){
                                newAttrArr.Values.push(newAttrVal);
                            }
                        })
                        itemInfo.Variations.push(newAttrArr);
                    })
                 }
                 if(itemInfo.Items.length == 0) itemInfo.Status = 'outOfStock';//没货
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                callback(null, itemInfo);
                return ;
            })

            //获取券
            if (itemInfo.ItemAttributes.VenderType != '自营'){
                var quan_url = "https://item.m.gome.com.cn/product/ajaxProduct?goodsNo="+gid+"&skuID="+sid+"&skuPrice=2298&shopId=&isShop=1&isBbc=Y&natural=1&istlp=0&_="+new Date().getTime();
            } else {
                var quan_url = "https://item.m.gome.com.cn/product/ajaxProduct?goodsNo="+gid+"&skuID="+sid+"&skuPrice=2298&shopId=&isShop=0&isBbc=N&natural=1&istlp=0&_="+new Date().getTime();
            }
                getHtml(quan_url, function(quanInfo, err){
                    if(err){
                        callback({
                            "Errors":{
                                'Code': 'Error',
                                "Message": err
                            }
                        });
                        return '';
                    }
                    try{
                        quanInfo = JSON.parse(quanInfo);
                    }catch(e){
                        callback({
                            "Errors":{
                                'Code': 'Error',
                                "Message": err
                            }
                        });
                        return '';
                    }
                    ep.emit('priceSkus', ['quan', quanInfo]);
                },'application/json','XMLHttpRequest','https://item.m.gome.com.cn/product-'+gid+'-'+sid+'.html');


            //获取价格
            priceSkus.forEach(function (priceSku) {
                var wap_url = "https://item.m.gome.com.cn/product/stock?goodsNo="+gid+"&skuID="+priceSku+"&shopId=&shopType=&provinceId=11000000&cityId=11010000&districtId=11010200&townId=110102002&modelId=&stid=&mid=&isFirst=Y&isPresent=0&ajax=1&_="+new Date().getTime();
                getHtml(wap_url, function(bodyPrices, err){
                    if(err){
                        callback({
                            "Errors":{
                                'Code': 'Error',
                                "Message": err
                            }
                        });
                        return '';
                    }
                    try{
                        bodyPrices = JSON.parse(bodyPrices);
                    }catch(e){
                        callback({
                            "Errors":{
                                'Code': 'Error',
                                "Message": e
                            }
                        });
                        return '';
                    }
                    ep.emit('priceSkus', ['price', [priceSku,bodyPrices]]);
                },'application/json','XMLHttpRequest','https://item.m.gome.com.cn/product-'+gid+'-'+priceSku+'.html');
            })

            //获取图片
            if (colorSkus){
                colorSkus.forEach(function (colorSku) {
                    var wap_url ="https://item.m.gome.com.cn/product-"+gid+"-"+colorSku.skuid+".html";
                    getHtml(wap_url, function(bodyColor, err){
                        if(err){
                            callback({
                                "Errors":{
                                    'Code': 'Error',
                                    "Message": err
                                }
                            });
                            return '';
                        }
                        try{
                            var exp = /var\s*gData\s*=\s*(\{.*\});/ig;
                            bodyColor = exp.exec(bodyColor);
                            bodyColor = JSON.parse(bodyColor[1]);
                        }catch(e){
                            callback({
                                "Errors":{
                                    'Code': 'Error',
                                    "Message": err
                                }
                            });
                            return '';
                        }
                        ep.emit('priceSkus', ['image', bodyColor]);
                    });
                })
            }
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
}


/*
 *获取html
 **/
function getHtml(urlStr, callback, accept, ajax, referer){
    if (!accept) accept ='text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
    if (!referer) referer = 'https://m.gome.com.cn/';
    proxyRequest({
        url: urlStr,
        gzip: true,
        timeout: 5000,
        headers: {
            'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
            "Accept":accept,
            "Accept-Encoding":"gzip, deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8,en;q=0.6",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache",
            "Referer":referer,
            "X-Requested-With":ajax
        },
         //proxy: 'http://172.16.49.45:8888'
        //encoding: null
    }, function(error, response, body, callbackStatus) {

        if(!error){
            if (body.indexOf('Please retry your requests at a slower rate') > 0
                || body.indexOf('Direct connection failed, no parent proxy') > 0
            ) {
                callbackStatus(false);
            } else {
                callbackStatus(true);
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}

