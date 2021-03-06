var request = require('request');
var _ = require('lodash');
var url = require('url');
var md5 = require('md5');
var Q = require('q');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
const gwyy = require('../../tools/gwyy');

exports.getInfo = function(urlstr,index, callback) {
    //解析url
    var urlInfo = url.parse(urlstr, true);
    
    //如果是淘宝或者天猫的统一处理
    if (
        (!urlInfo.query.id) ||
    urlInfo.host != 'item.taobao.com' && urlInfo.pathname != '/item.htm' &&   
    urlInfo.host != 'detail.tmall.com' &&  urlInfo.pathname != '/item.htm' && 
    urlInfo.host == 'detail.tmall.hk' &&  urlInfo.pathname == '/item.htm') {
        callback('host error is not taobao hostname');
    }
    getItemInfo(urlstr,index, callback);
}



/**
 * 处理抓取评论函数
 */
function getItemInfo(detail_url,page_index, callback){
    //拼装url
    var urlInfo = url.parse(detail_url, true);
    if(!_.has(urlInfo,"query.id")) {
        callback({"Errors":{'Code': 'error',"Message": "没有商品id"}},null);return;
    }
    var detail_id = _.get(urlInfo,"query.id");


    //拼装评论地址
    var comment_url = "https://rate.tmall.com/list_detail_rate.htm?itemId="+detail_id+"&spuId=0&sellerId=111223&order=3&currentPage="+page_index+"&append=0&content=1&tagId=&posi=&picture=&callback=a";
 
    //https://rate.tmall.com/list_detail_rate.htm?itemId=573499701558&spuId=0&sellerId=111223&order=3&currentPage=1&append=0&content=1&tagId=&posi=&picture=&callback=a

    //https://item.taobao.com/item.htm?id=573499701558&ali_trackid=2:mm_12924585_12440234_47166236:1538223448_129_1429896508&spm=a21bo.7925826.192013.1.75354c0dQOS2rQ



    //抓取第一页评论
    proxyRequest({
        url:comment_url,
    },function(err,body){
        if(err){ callback(err);return;}
        body = _.trim(body);
        body = _.trimStart(body, 'a(');
        body = _.trimEnd(body, ')');
        body = JSON.parse(body);
        
        var itemInfo = {
            Unique: 'com.taobao.'+detail_id,  //店铺数据
            Status: 'inStock',          //状态
            Url: detail_url,              //url
            //ShopUrl : 'https://shop'+res1[1]+'.taobao.com/',  //店铺链接
            ShopUrl:'',
            Comments: []            //评论数组 默认是空
        };

        //如果没有总数 那么直接返回
        if(!_.has(body,"rateDetail.rateCount")) {
            callback(null,itemInfo);return;
        }
        var pageNum = body.rateDetail.rateCount.total;   //最大数
        var page = (pageNum > 0) ? Math.ceil(pageNum / 20) : 1;  //最大数 除以 每页20
        var urls = [];
        var items = [];
        var comments = [];
        if(_.has(body,"rateDetail.rateList")) {
            body.rateDetail.rateList.forEach(function(comment,index){
                let _index = index;  
                _index++;
                _index = ((page_index -1) * 20) + _index;
                //声明 图片数组
                var photos = [];
                if(_.has(comment,"pics") && _.isArray(comment.pics)) {
                    comment.pics.forEach(function(photo_v){
                        photos.push('http:'+photo_v);
                    })
                }

                //判断是否有附加评论
                if(!_.has(comment,"appendComment") ||  comment.appendComment == null || comment.appendComment == undefined) {
                    comment.appendComment = {};
                    comment.appendComment.is_extra = 0;
                    comment.appendComment.content = "";
                    comment.appendComment.photos = [];
                } else {
                    comment.appendComment.is_extra = 1;
                    comment.appendComment.photos = [];
                    //解析pic
                    if(_.has(comment,"appendComment.pics") && _.isArray(comment.appendComment.pics)) {
                        comment.appendComment.pics.forEach(function(photo_v){
                            comment.appendComment.photos.push('http:'+photo_v);
                        })
                    }
                }
                itemInfo.Comments.push({
                    'Sku':comment.auctionSku,
                    'Date': _.replace(_.replace(_.replace(comment.rateDate,'年','-'),'月','-'),'日',''),
                    'Content': comment.rateContent,
                    'Nick':comment.displayUserNick,
                    'Photos':photos,

                    'Id':comment.id,
                    'Rank':_index,
                    'Extra':comment.appendComment.content,
                    'Extra_pic':comment.appendComment.photos,
                    'Is_extra':comment.appendComment.is_extra,
                    'Relate_type':0, 

                    'Md5': md5(JSON.stringify(comment.rateContent+comment.displayUserNick+photos))
                })
            })
        }
        callback(null,itemInfo);
        return true;
    

        /*
        page = page > 5 ? 5 : page;
        for(var i= 2;i <= page;i++){
            //&rateType=3
           // urls.push("https://rate.tmall.com/list_detail_rate.htm?itemId="+detail_id+"&spuId=0&sellerId=111223&order=3&currentPage="+i+"&append=0&content=1&tagId=&posi=&picture=&callback=a");
            urls.push("https://rate.tmall.com/list_detail_rate.htm?itemId="+detail_id+"&spuId=0&sellerId=111223&order=3&currentPage="+i+"&append=0&content=1&tagId=&posi=&picture=&callback=a");
        }


        //处理抓取的页面json
        var ep = new eventproxy();
        ep.after('currentUrls', urls.length, function (currentItems) {
            currentItems.forEach(function(currentItem,index){
                currentItem = _.trim(currentItem);
                currentItem = _.trimStart(currentItem, 'a(');
                currentItem = _.trimEnd(currentItem, ')');
                currentItem = JSON.parse(currentItem);
                if(_.has(currentItem,"rateDetail.rateList")) {
                    let page = currentItem.rateDetail.paginator.page;
                   
                    currentItem.rateDetail.rateList.forEach(function(comment,index){
                        //设置位置
                        let _index = index;
                        _index++;
                        _index = _index + ((page-1) * 20);  //计算分页数
                       
                        //声明 图片数组
                        var photos = [];
                        if(_.has(comment,"pics") && _.isArray(comment.pics)) {
                            comment.pics.forEach(function(photo_v){
                                photos.push('http:'+photo_v);
                            })
                        }

                         //判断是否有附加评论
                        if(!_.has(comment,"appendComment") ||  comment.appendComment == null || comment.appendComment == undefined) {
                            comment.appendComment = {};
                            comment.appendComment.is_extra = 0;
                            comment.appendComment.content = "";
                            comment.appendComment.photos = [];
                        } else {
                            comment.appendComment.is_extra = 1;
                            comment.appendComment.photos = [];
                            //解析pic
                            if(_.has(comment,"appendComment.pics") && _.isArray(comment.appendComment.pics)) {
                                comment.appendComment.pics.forEach(function(photo_v){
                                    comment.appendComment.photos.push('http:'+photo_v);
                                })
                            }
                        }

                        comments.push({
                            'Sku':comment.auctionSku,
                            'Date': _.replace(_.replace(_.replace(comment.rateDate,'年','-'),'月','-'),'日',''),
                            'Content': comment.rateContent,
                            'Nick':comment.displayUserNick,
                            'Photos':photos,

                            'Id':comment.id,
                            'Rank':_index,
                            'Extra':comment.appendComment.content,
                            'Extra_pic':comment.appendComment.photos,
                            'Is_extra':comment.appendComment.is_extra,
                            'Relate_type':0, 

                            'Md5': md5(JSON.stringify(comment.rateContent+comment.displayUserNick+photos))
                        })
                    })
                }
            })
            comments.forEach((v) => {itemInfo.Comments.push(v)});
            //itemInfo.Comments = comments;
            callback(null,itemInfo);
            return ;
        })

        //并发取数据  先并发抓  
        urls.forEach(function (currentUrl) {
            proxyRequest({
                url:currentUrl,
                encoding: null
            }, function(err, body){
                if(err){
                    callback({
                        "Errors":{
                            'Code': 'error',
                            "Message": err
                        }
                    });
                    return '';
                }
                ep.emit('currentUrls', body);
            });
        }) */


    });
}


/*
 *获取html
 **/
var maxRequestNum = 2;
var requestNum = 0;
function proxyRequest(options, callback){
    options.headers = {
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
        "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        "Accept-Encoding":"deflate, br",
        "Accept-Language":"zh-CN,zh;q=0.9,en;q=0.8,pl;q=0.7,zh-TW;q=0.6,hu;q=0.5,mt;q=0.4",
        "cookie":":thw=cn; cna=fR+hDeeT50ICATr3cloaZbmD; miid=6345998908287345826; x=e%3D1%26p%3D*%26s%3D0%26c%3D0%26f%3D0%26g%3D0%26t%3D0%26__ll%3D-1%26_ato%3D0; lzstat_uv=8629291913329613887|2144678; tracknick=hxl724753832; _cc_=VT5L2FSpdA%3D%3D; tg=0; _m_h5_tk=a8c851e108396671a4a47fe2800f8b1c_1453691787833; _m_h5_tk_enc=cc4c05577d30d7d43b66584d2846a3d7; v=0; linezing_session=9q62Zftrxc6myk5U5wogiuSm_1453875476406Wc5G_1; isg=4BDE5B1133BD9B93442D2FA1B939DF07; _tb_token_=583e611e13374; mt=ci%3D-1_0; uc1=cookie14=UoWyjVdEi6VXIg%3D%3D; cookie2=1c7b75338f80538f4f0548e69714c245; t=17cb7c33aba0dc662a5d8eb53fdf6401; l=ApCQQCCBQfb994wdQkfa8wZJ4NDlzHTW"
   };
    var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
    Q('get').then(function(success){
        var defer = Q.defer();
        request({url:developUrl,timeout:2000}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                if(body.status == 'ok'){
                    options.proxy = 'http://'+body.Ip.Ip+':'+body.Ip.Port;
                    defer.resolve('success');
                }
            }else{
                defer.reject('代理服务器错误');
            }
        })
        return defer.promise;
    }).then(function(success){
        var chunks = [];
        options.timeout = 5000;
          /*
        request(options,function(error,response,body) {
            if (!error && response.statusCode == 200) {
                var decodedBody = iconv.decode(Buffer.concat(chunks), 'gbk');
                callback(null, decodedBody, response);
            }else{
                callback(error, null, null);
            }
        }).on('data', function(data) {
            chunks.push(data);
        }); */
        request(options,function(error,response,body) {
            if (!error && response.statusCode == 200) {
                callback(null, body, response);
            }else{
                callback(error, null, null);
            }
        });
    },function(rejected){
        callback(rejected, null, null);
    })
}