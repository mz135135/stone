var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var redisConfig = config.db.redis;
var SequelizeDb = require('../lib/db').db;
const Op = SequelizeDb.sequelize.Op;
const tableStore = require(process.cwd()+"/apps/lib/tablestore.js").tableStore;
const Q = require("q");
const _ = require('lodash');
var url  = require('url');
const crawlmainTaskES = require(process.cwd()+"/apps/lib/elasticsearch/crawlMainTasks.js").esClient;


var os = require("os")

var RedLock = require('redlock-node');
var ethInfo = os.networkInterfaces().eth1;

var initFlag = true;
if (!NODE_ENV &&  ethInfo != undefined){
	if (ethInfo[0].address == '47.88.18.192' || ethInfo[0].address == '47.88.77.102'){
		initFlag = false;
	}
}
if (initFlag){
	var client = require('redis').createClient(redisConfig.port,redisConfig.host);
	if (!NODE_ENV){
		//线上环境需要认证
	    client.auth(redisConfig.password);
	}
	var redlock = new RedLock(client);
} else {
	var redlock;
}

var lock;

//特殊处理的商城
var storeArr = config.crawltask.store.jd;
var guowaiArr = config.crawltask.store.guowai;
var guoneiArr = config.crawltask.store.guonei;
var taobaoArr = config.crawltask.store.taobao;

exports.getMainList = function(request, response) {
	handler(request, response);
}

var controller = {
    getDataEs:function(store){
        var that = this;
        var defer = Q.defer();
        
        crawlmainTaskES.search(
            { store:store, status: 0, size: 500, sort: [['from', 'desc'],['update_at', 'asc']]
        }, function (err, res) {
            if (err) {
                return defer.reject(err);
            }

            var data = [];
            var rows = res.hits.hits;
            if (rows.length > 0){
                rows.forEach(function(row){
                    data.push({
                        task_id: row._source.task_id,
                        url: row._source.url,
                        store : row._source.store
                    });
                })
            return defer.resolve({
                    status : true,
                    data:data
                });
            } else {
                return defer.reject('没有任务了');
            }
        })
        return defer.promise;
    },
    getDataOtherEs:function(store){
        var size = 1000;
        if(store == 'guonei'){
            var storeStr = _.chain(guoneiArr)
              .map(function(mall){
                return mall.name;
              })
              .value();
        }else if(store == 'taobao'){
            var storeStr = _.chain(taobaoArr)
              .map(function(mall){
                return mall.name;
              })
              .value();
            size = 2500;
        } else {
            var storeStr = _.chain(guowaiArr)
              .map(function(mall){
                return mall.name;
              })
              .value();
        }
        var defer = Q.defer();

        crawlmainTaskES.search(
            { store:storeStr, status: 0, size: size, sort: [['from', 'desc'],['update_at', 'asc']]
        }, function (err, res) {
            if (err) {
                return defer.reject(err);
            }

            var data = [];
            var rows = res.hits.hits;
            if (rows.length > 0){
                rows.forEach(function(row){
                    data.push({
                        task_id: row._source.task_id,
                        url: row._source.url,
                        store : row._source.store
                    });
                })
            return defer.resolve({
                        status : true,
                        data:data
                    });
            } else {
                return defer.reject('没有任务了');
            }
        })

        return defer.promise;
    },
    updateDataEs:function(taskId){
        var defer = Q.defer();
        var now = new Date();

        crawlmainTaskES.update({
            task_id: taskId,
            'status' : 1,
            'update_at' : now
        }, function (err, res) {
            if (err) {
                return defer.reject(new Error('保存ES错误'));
            }

            return defer.resolve({
                status : true
            });
        }, true)
        return defer.promise;
    }
}

//队列
var dataList = {
    storeArrList:[],
    guoneiArrList:[],
    guowaiArrList:[],
    taobaoArrList:[],
};

//抓取标志
var storeFlag;
var guoneiFlag;
var guowaiFlag;
var taobaoFlag;

//抓取时间
var storeTime;
var guoneiTime;
var guowaiTime;
var taobaoTime;

//初始化获取队列
var initialize = function(store){
    if (store == '' || store == '京东'){
        storeFlag = true;
        storeTime = (new Date()).getTime();
        controller.getDataEs('京东').then(function (data) {
            dataList.storeArrList = data.data;
            storeFlag = false;
        },function (err) {
            console.log('京东' + err)
            storeFlag = false;
        })
    }

    if (store == '' || store == 'guonei'){
        guoneiFlag = true;
        guoneiTime = (new Date()).getTime();
        controller.getDataOtherEs('guonei').then(function (data) {
            dataList.guoneiArrList = data.data;
            guoneiFlag = false;
        },function (err) {
            console.log('guonei' + err)
            guoneiFlag = false;
        });
    }

    if (store == '' || store == 'guowai'){
        guowaiFlag = true;
        guowaiTime = (new Date()).getTime();
        controller.getDataOtherEs('guowai').then(function (data) {
            dataList.guowaiArrList = data.data;
            guowaiFlag = false;
        },function (err) {
            console.log('guowai' + err)
            guowaiFlag = false;
        })
    }

    if (store == '' || store == 'taobao'){
        taobaoFlag = true;
        taobaoTime = (new Date()).getTime();
        controller.getDataOtherEs('taobao').then(function (data) {
            dataList.taobaoArrList = data.data;
            taobaoFlag = false;
        },function (err) {
            console.log('taobao' + err)
            taobaoFlag = false;
        })
    }
}
initialize('');


//处理核心逻辑
var handler = function (request, response){
    var store = request.query.store;
    //验证 必须传store
    if (!store) {
        return response.json({code: 400, msg: '缺少store参数'});
    }

    var resultList = [];
    var resultFlag;
    var resultTime;
    if (store == '京东'){
        resultList = dataList.storeArrList;
        resultFlag = storeFlag;
        resultTime = storeTime;
    } else if(store == 'guonei'){
        resultList = dataList.guoneiArrList;
        resultFlag = guoneiFlag;
        resultTime = guoneiTime;
    } else if(store == 'guowai'){
        resultList = dataList.guowaiArrList;
        resultFlag = guowaiFlag;
        resultTime = guowaiTime;
    } else if(store == 'taobao'){
        resultList = dataList.taobaoArrList;
        resultFlag = taobaoFlag;
        resultTime = taobaoTime;
    }

    console.log(store + ' has ' + resultList.length)
    if (resultList.length == 0){
        if (!resultFlag || (new Date().getTime() - resultTime > 20 * 1000)){
            initialize(store);
        }
        response.json({code: 400, msg: store+'没有任务了'});
    } else {
        var reslut = resultList.pop();
        var redis_key = 'stone_get_crawl_task2_'+reslut.task_id;
        //用redis的方式存储是否获取过，防止es更新缓慢造成重复抓取的问题
        client.get(redis_key, function (err, reply) {
            if (!reply){//没有获取过
                //获取完把状态更新成1（处理中） todo 加快更新速度此处不更新es状态
                //controller.updateDataEs(reslut.task_id).then(function (datas) {
                    client.set(redis_key, 1);
                    client.expire(redis_key, 10);
                    response.json({code: 200, msg: '',data:reslut});
                // }, function (errs) {
                //     response.json({code: 400, msg: err.message});
                // })
            } else {
                //100ms后继续获取
                setTimeout(function(){
                    handler(request, response);
                },50)
            }
        });
    }
    return;
}
