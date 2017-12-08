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
        ['有货', ['item.yohobuy.com']],
        ['银泰', ['item.yintai.com']],
        ['识货自营', ['www.shihuo.cn\/xianhuo']],
        ['卡路里商城', ['www.kaluli.com']],
        ['footlocker官网', ['www.footlocker.com']],
        ['UA官网', ['www.underarmour.cn']],
        ['特步官网', ['www.xtep.com.cn']],
        ['考拉海购', ['www.kaola.com']],
        ['国美在线', ['item.gome.com.cn']],
        ['苏宁易购', ['www.suning.com']],
        ['毒', ['du.hupu.com']],
        ['西集', ['www.xiji.com']],
        ['美囤妈妈', ['item.meitun.com']],
        ['贝贝', ['www.beibei.com']],
        ['蜜芽', ['www.mia.com']]
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


exports.stoneLog = function (type, level, param) {
    var type = type || 'stone';
    var level = level || 'trace';
    var fs = require('fs');
    var res = {
        'evt': 'stone',
        'vtm': parseInt((new Date()) / 1000),
        'body': {
            'param1':type,
            'key': 'stone',
            'level': level,
        }
    };
    _(param).forEach(function (val, key) {
        if (key == 'param') {
            res.body[key] = JSON.stringify(val);
        } else {
            res.body[key] = val;
        }
    })
    fs.appendFile("/data0/log-data/shihuo.log", JSON.stringify(res) + "\n", function (err) {
        if (err) {
            return console.error(err);
        }
        return true
    });
}
