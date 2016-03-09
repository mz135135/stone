var assert = require('assert');
var yougou = require('../lib/yougou');


describe('yougou', function() {
    describe('#getItemInfo', function () {
        it('测试yougou商品',function(done){
            this.timeout(60000)
            yougou.getInfo('http://seoul.yougou.com/c-chrischristy/sku-kcxalrc1041-100343796.shtml#ref=search&po=search',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.yougou.kcxalrc1041',data.Unique);
                assert.ok(data.Variations.length > 0,'data.Variations.length is 0');
                assert.ok(data.Variations[0].Values.length > 0,'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0,'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })
    });

});