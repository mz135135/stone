var fs = require('fs');
var  _ = require('lodash')


exports.rnd = function (start, end) {
    return Math.floor(Math.random() * (end - start) + start);
}

exports.getClientIP = function (req) {
    var ipAddress;
    var headers = req.headers;
    var forwardedIpsStr = headers['x-real-ip'] || headers['x-forwarded-for'];
    forwardedIpsStr ? ipAddress = forwardedIpsStr : ipAddress = null;
    if (!ipAddress) {
        ipAddress = req.connection.remoteAddress;
    }
    return ipAddress;
}

exports.isJson = function (str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

exports.writeLog = function (name, content) {
    if (!fs.existsSync(process.cwd() + "/logs/")) {
        fs.mkdirSync(process.cwd() + "/logs/")
    }
    fs.writeFile(process.cwd() + "/logs/" + name, content, function (err) {
        if (err) {
            return console.error(err);
        }

        return true
    });
}

exports.readLog = function (name) {
    if (fs.existsSync(process.cwd() + "/logs/" + name)) {
        return fs.readFileSync(process.cwd() + "/logs/" + name, 'utf8');
    } else {
        return '';
    }
}

exports.getStore = function (urlStr) {
    var store = [
        ['淘宝', ['item.taobao.com']],
        ['天猫', ['detail.tmall.com', 'detail.tmall.hk']],
        ['美亚', ['www.amazon.com']],
        ['中亚', ['www.amazon.cn']],
        ['日亚', ['www.amazon.co.jp']],
        ['6pm', ['www.6pm.com']],
        ['优购', ['www.yougou.com', 'seoul.yougou.com']],
        ['NIKE官网', ['store.nike.com', 'www.nike.com']],
        ['京东', ['item.jd.com', 'item.jd.hk']],
        ['识货海淘', ['www.shihuo.cn\/haitao']],
        ['识货团购', ['www.shihuo.cn\/tuangou']],
        ['nbaStore', ['store.nba.com']],
        ['有货', ['item.yohobuy.com', 'www.yohobuy.com']],
        ['银泰', ['item.yintai.com']],
        ['识货自营', ['www.shihuo.cn\/xianhuo']],
        ['卡路里商城', ['www.kaluli.com']],
        ['footlocker官网', ['www.footlocker.com']],
        ['UA官网', ['www.underarmour.cn']],
        ['特步官网', ['www.xtep.com.cn']],
        ['考拉海购', ['www.kaola.com', 'goods.kaola.com']],
        ['国美在线', ['item.gome.com.cn']],
        ['苏宁易购', ['suning.com']],
        ['毒', ['du.hupu.com']],
        ['西集', ['www.xiji.com']],
        ['美囤妈妈', ['item.meitun.com', 'item.babytreegroup.hk']],
        ['贝贝', ['www.beibei.com']],
        ['唯品会', ['detail.vip.com']],
        ['华为商城', ['www.vmall.com']],
        ['蜜芽', ['www.mia.com']],
        ['澳洲chemistdirect', ['cn.chemistdirect.com.au']],
        ['澳洲pharmacy4less', ['cn.pharmacy4less.com.au']],
        ['澳洲pharmacyonline', ['cn.pharmacyonline.com.au']],
        ['新西兰pharmacydirect', ['cn.pharmacydirect.co.nz']],
        ['德国discount-apotheke', ['cn.discount-apotheke.de']],
        ['德国amcal', ['cn.amcal.com.au']],
        ['德国apo', ['cn.apo.com']],
        ['澳洲abcpost', ['www.abcpost.com.au']],
        ['德国delemei', ['www.delemei.de']],
        ['德国BA保镖', ['www.ba.de']],
        ['新西兰Kiwistarcare', ['www.kiwistarcare.com']],
        ['德国UKA', ['cn.unserekleineapotheke.de']],
        ['荷兰DOD', ['cn.dod.nl']],
        ['farfetch', ['www.farfetch.com']],
        ['小红书',['pages.xiaohongshu.com']],
        ['波罗蜜',['m.bolo.me']],
        ['丝芙兰',['www.sephora.cn']],
        ['聚美优品',['item.jumei.com','item.jumeiglobal.com']],
        ['香港莎莎网',['www.sasa.com']],
        ['香港草莓网',['cn.strawberrynet.com']],
        ['香港卓悦网',['www.bonjourhk.com']],
        ['豌豆公主',['m.wandougongzhu.cn']]
    ];

    var name = '其他';
    for (var i = 0; i < store.length; i++) {
        store[i][1].forEach(function (patt) {
            reg = new RegExp(patt, "ig");
            res = reg.exec(urlStr)
            if (res) {
                name = store[i][0];
                return true;
            }
        })

        if (name != '其他') {
            break
        }
    }
    return name;
}


exports.stoneLog = function (key, level, param) {
    var key  = key || 'stone';
    var level = level || 'trace';
    var res = {
        'evt' : 'stone',
        'key'   :  key,
        'level' :  level,
    };
    _(param).forEach(function (val, key) {
        if (key == 'param') {
            res[key] = JSON.stringify(val);
        } else {
            res[key] = val;
        }
    })

    var filePath = "/data0/log-data/stone-"+exports.dateformat(new Date(), 'yyyy.MM.dd')+".log"
    fs.appendFile(filePath, JSON.stringify(res) + "\n", function (err) {
        if (err) {
            return console.error(err);
        }
        return true
    });
}


exports.generateTaskId = function (url) {
    var date = exports.dateformat(new Date(), 'yyyy.MM.dd');
    var millisecond = (new Date()).getTime();
    var rand = Math.random();

    return  date+md5(rand+url+millisecond);
}


exports.dateformat = function (data, fmt) { //author: meizz
    var o = {
        "M+": data.getMonth() + 1, //月份
        "d+": data.getDate(), //日
        "h+": data.getHours(), //小时
        "m+": data.getMinutes(), //分
        "s+": data.getSeconds(), //秒
        "q+": Math.floor((data.getMonth() + 3) / 3), //季度
        "S": data.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (data.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

exports.isDate = function(str){
    return /(\d{4})\.(\d{2})\.(\d{2})/.exec(str) ? true : false;
}