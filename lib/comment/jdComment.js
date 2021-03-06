//京东评论抓取 @liangtian
//https://sclub.jd.com/comment/productPageComments.action?productId=5045080&score=0&sortType=5&page=0&pageSize=10&isShadowSku=0&fold=1
var request = require('request');
var _ = require('lodash');
var url = require('url');
var md5 = require('md5');
var Q = require('q');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')


exports.getInfo = function(urlstr,page_index, callback) {
    //解析url
    var urlInfo = url.parse(urlstr, true);
    //如果是淘宝或者天猫的统一处理
    if (urlInfo.host == 'item.jd.com' || urlInfo.host == 'item.jd.hk') {
        getItemInfo(urlInfo,page_index, callback);
    } else {
        callback('host error is not jd hostname');
    }
}

function  gwyy(str) {
    console.log(JSON.stringify(str,null,2));
    process.exit();
}
/**
 * 处理抓取评论函数
 */
function getItemInfo(urlInfo,page_index, callback){
    //获取商品id
    var gomeRegExp = /^\/([a-zA-Z0-9]+).html/gi;
    var  goods_id = gomeRegExp.exec(urlInfo.pathname);
    if(Array.isArray(goods_id) && goods_id[1] != undefined) {
        goods_id = goods_id[1];
    } else {
        callback("not found goods id");
    }
    //拼装评论url
    var comment_url = 'https://sclub.jd.com/comment/productPageComments.action?productId='+goods_id+'&score=0&sortType=5&page='+(--page_index)+'&pageSize=10&isShadowSku=0&fold=1';
    console.log(comment_url);
    //通过代理 获取url
    proxyRequest({
        url: comment_url
    },function(err, body){
        if(err){
            callback(err); return ;
        }
        try {
            var commentData = JSON.parse(body);
        }  catch(err) {
            callback("comment json parse error");
        }
      
        //拼装返回数据
        var itemInfo = {
            Unique: 'com.jd.'+goods_id,  //店铺数据
            Status: 'inStock',          //状态
            Url: urlInfo.href,              //url
            ShopUrl : 'http://www.jd.com/',  //店铺链接
            Comments: []            //评论数组 默认是空
        };
        /*
        if(typeof (commentData.productCommentSummary.commentCount) == undefined) throw Error('无法获取评论最大数');
        var pageNum = commentData.productCommentSummary.commentCount;   //最大数
        var page = (pageNum > 0) ? Math.ceil(pageNum / 10) : 1;  //最大数 除以 每页20
        var urls = [];
        var items = [];
        */
        var comments = [];
        
        //先解析第一页的
        comments = parseComment(commentData);
        itemInfo.Comments = commentUnique(comments);
        callback(null,itemInfo);


        /*
        //最多抓取5页 其实京东是从0 页开始算的 所以我们一共会抓6页
        page = page > 5 ? 5 : page;
        //我们已经把第一页抓取回来了 所以我们只需要判断是否大于1就好了
        if(page > 1) {  //如果大一页 我们需要 通过 异步获取后几页的数据
            //我们从第二页开始抓
            for(var i= 1;i <= page;i++){
                //&rateType=3
                urls.push('https://sclub.jd.com/comment/productPageComments.action?productId='+goods_id+'&score=0&sortType=5&page='+i+'&pageSize=10&isShadowSku=0&fold=1');
            }
            //处理抓取的页面json
            var ep = new eventproxy();
            ep.after('currentUrls', urls.length, function (currentItems) {
                currentItems.forEach(function(currentItem){
                    try {
                        currentItem = JSON.parse(currentItem);
                        var currentComments = parseComment(currentItem);
                        //添加到 comments 里面
                        currentComments.forEach((v) => {comments.push(v)});
                    } catch(err) {
                        //出错就啥也不错。。。 不抓这个评论
                        console.log(err);
                    }
                })
                itemInfo.Comments = commentUnique(comments);
                callback(null,itemInfo);
            })
            //并发取数据
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
            })

    
        } else {  //否则 直接返回即可
            ;
            itemInfo.Comments = commentUnique(comments);
            callback(null,itemInfo);
        }
        */


    })  //proxyRequest  end
}  //getItemInfo end


/**
 * 解析评论 json
 */

//https://img30.360buyimg.com/shaidan/s616x405_jfs/t6499/130/397943402/12348/422d144a/593ea563Nef594e79.jpg
//https://img30.360buyimg.com/n0/s616x405_jfs/t5623/345/3633890087/72114/25a07ee0/593f75b1N60c1c936.jpg
//https://img30.360buyimg.com/shaidan/s616x405_jfs/t5623/345/3633890087/72114/25a07ee0/593f75b1N60c1c936.jpg
function parseComment(commentData) {
    if(commentData == '') return [];
    var currentData = commentData;
    if(typeof currentData == 'string') { //如果是字符串 那么要解析json
        try {
            var currentData = JSON.parse(currentData);
        }  catch(err) {
            return [];
        }
    } 
    if(!_.has(currentData,'comments')) return [];
    //if(typeof (currentData.comments) == undefined) return [];
    var comments = [];
    currentData.comments.forEach(function(v) {
        if(typeof (v.referenceName) == undefined) v.referenceName = '';
        var pic = [];
        //处理图片
        if(typeof v.images == 'object' && Array.isArray(v.images) && v.images.length > 0) {
            v.images.forEach(function(img){
                img.imgUrl = img.imgUrl.replace('/n0/s128x96_','/shaidan/s616x405_');
                pic.push('https:'+img.imgUrl);
            });
        }
        comments.push({
            'Sku':v.referenceName,
            'Id':v.id,
            'Date': v.referenceTime,
            'Content': v.content,
            'Nick': v.nickname,
            'Photos':pic,
            'Md5': md5(v.content+v.referenceTime+v.nickname)
        });
    });
    return comments;
}


/**
 * 评论去重，去除5个字以下的评论
 */
function commentUnique(comments) {
    var new_comments = [];
    var contents = [];
    //遍历评论 剔除不合格的
    comments.forEach(function(val){
        val.Content = _.trim(val.Content);
        //判断长度
        if(val.Content.length < 5) return;

        //如果是默认评价 那么也跳过
        if(val.Content == '用户未及时评价，显示为默认评价。') return;

        //判断是否有保存好的评论
        if(contents.length > 0) {
            if(in_array(contents,val.Content))  return;
        } 
        new_comments.push(val);
        contents.push(val.Content);
    });
    return new_comments;
}
function in_array(arr, str) {
    var i = arr.length;
    while (i--) {
        if (arr[i] === str) {
            return true;
        }
    }
    return false;
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
         "Accept-Encoding":"deflate, sdch",
         "Accept-Language":"zh-CN,zh;q=0.8",
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
        request(options,function(error,response,body) {
            if (!error && response.statusCode == 200) {
                var decodedBody = iconv.decode(Buffer.concat(chunks), 'gbk');
                callback(null, decodedBody, response);
            }else{
                callback(error, null, null);
            }
        }).on('data', function(data) {
            chunks.push(data);
        });

    },function(rejected){
        callback(rejected, null, null);
    })
}