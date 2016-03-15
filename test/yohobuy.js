var assert = require('assert');
var yohobuy = require('../lib/yohobuy');


describe('yohobuy', function() {
    describe('#getItemInfo', function () {
        it('测试yohobuy正常商品',function(done){
            this.timeout(30000)
            yohobuy.getInfo('http://item.yohobuy.com/product/pro_318189_409293',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.yohobuy.318189.409293',data.Unique);
                assert.ok(data.Variations.length > 0,'data.Variations.length is 0');
                assert.ok(data.Variations[0].Values.length > 0,'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0,'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })

        it('测试yohobuy售罄下架商品',function(done){
            this.timeout(30000)
            yohobuy.getInfo('http://item.yohobuy.com/product/pro_69744_105661',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('outOfStock',data.Status);
                assert.equal('cn.yohobuy.69744.105661',data.Unique);
                done()
            })
        })

        it('测试yohobuy不存在商品',function(done){
            this.timeout(30000)
            yohobuy.getInfo('http://item.yohobuy.com/product/pro_6464646464',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('notFind',data.Status);
                assert.equal('cn.yohobuy.6464646464.undefined',data.Unique);
                done()
            })
        })
    });

});