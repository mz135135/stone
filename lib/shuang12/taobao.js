var request = require('request');
var _ = require('lodash');
var url = require('url');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');

var proxyRequest = require('../proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true);
    if (urlInfo.host == 'item.taobao.com' && urlInfo.pathname == '/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    } else if (urlInfo.host == 'detail.tmall.com' &&  urlInfo.pathname == '/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    } else if (urlInfo.host == 'detail.tmall.hk' &&  urlInfo.pathname == '/hk/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    }else {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
        return ;
    }
}

function getItemInfo(urlInfo, callback) {
    getHtml('https://unszacs.m.taobao.com/h5/mtop.taobao.detail.getdetail/6.0/?api=mtop.taobao.detail.getdetail&v=6.0&ttid=2013%40taobao_h5_1.0.0&type=jsonp&dataType=json&data=%7B%22itemNumId%22%3A%22'+urlInfo.query.id +'%22%7D', function(body ,err){
        if(err){
            callback(err);
            return ;
        }

        try {
            body = JSON.parse(body);
            if(body.ret != 'SUCCESS::调用成功'){
                callback('crawl error');
                return ;
            }

            var itemInfo = {
                UniqueId:  urlInfo.query.id,
                Price: {
                    Status: false,
                    Text: null,
                },
                Coupon: {
                    Status: false,
                    Text: null,
                }
            };


            var data = body.data;
            if(data.hasOwnProperty('apiStack')){
                var apiStackValue = data.apiStack[0].value;
                apiStackValue = JSON.parse(apiStackValue);

                if(
                    apiStackValue.resource.hasOwnProperty('coupon')
                    && apiStackValue.resource.coupon.hasOwnProperty('couponList')
                ){
                    apiStackValue.resource.coupon.couponList.forEach(function (val) {
                        if(val.title.indexOf('1212') > -1){
                            itemInfo.Coupon.Text = val.title;
                            itemInfo.Coupon.Status = true;
                        }
                    })
                }
            }

            callback(null,itemInfo);
            return ;

        } catch (exception){
            callback(exception);
            return ;
        }
    });
}

/*
 *获取html
 **/
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        headers: {
            'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache",
            'cookie':'cna=wUEmEDfrSXICAXTpm2vXEC1F; OZ_1U_1761=vid=v7de9ef0516c43.0&ctime=1474207521&ltime=1474207510; _m_user_unitinfo_=unit|unsz; _m_h5_tk=98be544d5acf014a07efab3faaf4f8fe_1477974426277; _m_h5_tk_enc=c6453c0b64e0797fb4f3211f004d1553; cookie1=BxuXsvQYNBRkeKpwXKczWSkrGNNnzIrQu7EEuyjbinE%3D; unb=761008464; skt=b4b211745fdcff77; _l_g_=Ug%3D%3D; _nk_=hxl724753832; cookie17=VAcPTBfHdD5t; uc1=cookie15=U%2BGCWk%2F75gdr5Q%3D%3D&existShop=false; login=true; _m_unitapi_v_=1477903139376; uss=BdLVZ962l1%2FM6X1lh7dNg%2B6X7916qolA0bHT0jbR7ptnL%2B750Y5QHMwP0A%3D%3D; hng=CN%7Czh-cn%7CCNY; uc3=nk2=CzU40LsQJv8VSkPW&id2=VAcPTBfHdD5t&vt3=F8dARHKvyrBOd56KP2o%3D&lg2=Vq8l%2BKCLz3%2F65A%3D%3D; lgc=hxl724753832; tracknick=hxl724753832; cookie2=3cdeec1bf34c3e21ab6919aac18e2f81; t=a4508d1c5e995d36c219759503a616f2; _tb_token_=ps8na8eJLaLz; ucn=unsz; l=AlFRjWNYA/QHnpQeORNl0KsQ4UbrvsUw; isg=Ary8y8VFyFee0_Oz5lfdmnlQjVw4OGDfLzPuJpY9yKeKYVzrvsUwbzLTMzPm',
        },
        // proxy: 'http://172.16.13.177:8888',
        //encoding: null
    }, function(error, response, body, callbackStatus) {
        if(!error){
            if (body.indexOf('Please retry your requests at a slower rate') > 0) {
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
