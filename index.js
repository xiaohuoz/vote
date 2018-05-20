$(document).ready(function(){
    console.log('homepage is ready now;');
    var NebPay = require("nebpay");
	var nebPay = new NebPay();
    var config = {
        dappAddress: "n1u7Yd5Vg8xRCfnzbbsjrr3H2fYpvUDMsY1",
        personalId: "",
    }
    var common = {
        tableHeadHtml: '<table class="table table-striped"><thead><tr><th>编号</th><th>标题</th><th>悬赏人数</th><th>参与投票赏金</th><th>查看结果费用</th><th>操作</th></tr></thead><tbody>',
        tableFootHtml: '</tbody></table>',
        tip: '<p style="text-align:center;margin: 30px 0;">暂无数据</p>'
    }
    init();
    function init(){
        window.addEventListener('message', function(e) {
            console.log("message: " + JSON.stringify(e.data)+JSON.stringify(e.origin));
            if(e && e.data && e.data.data && e.data.data.account){
                config.personalId = e.data.data.account;
            }
        })
        window.postMessage({
            "target": "contentscript",
            "data":{
                "to": "",
                "value": "0",
            },
            "method": "getAccount",
        }, "*");
        $('#closeTime').datepicker({
            language: "zh-CN",
            todayHighlight: true,
            clearBtn: true
        });
        let k = 10;
        let options = [];
        $('#add-option').on('click', function(){
            let uuid = getuuid();
            if($('#option1').val()!=='')
            options.push({
                uuid:uuid,
                value: $('#option1').val(),
            });
            $('#optionList').html(options.map(item=>'<li class="list-group-item"><span>'+item.value+'</span><button key="'+item.uuid+'" type="button" style="float: right;">-</button></li>'));
        });
        $('#optionList').on('click',function(e){
            console.log(e.target.type,e.target.value);
            if(e.target.type==='button'){
                options = options.filter(item=>item.uuid !== e.target.getAttribute('key'));
            }
            $('#optionList').html(options.map(item=>'<li class="list-group-item"><span>'+item.value+'</span><button key="'+item.uuid+'" type="button" style="float: right;">-</button></li>'));
        })
        $('#public').on('change',function(e){
            console.log('check',e.target.checked);
            if(!e.target.checked){
                $('#nas_label').addClass('hide');
                $('#nas_content').addClass('hide');
            }else{
                $('#nas_label').removeClass('hide');
                $('#nas_content').removeClass('hide');
            }
        });
        $('#isreward').on('change',function(e){
            console.log('check',e.target.checked);
            if(!e.target.checked){
                $('#person_count_label').addClass('hide');
                $('#person_count_content').addClass('hide');
                $('#sum_money_label').addClass('hide');
                $('#sum_money_content').addClass('hide');
            }else{
                $('#person_count_label').removeClass('hide');
                $('#person_count_content').removeClass('hide');
                $('#sum_money_label').removeClass('hide');
                $('#sum_money_content').removeClass('hide');
            }
        })
        $('#vote_button').on('click',function(){
            var selectoption='';
            var vote_id = ""
            var form = $('#vote_form').serializeArray();
            $.each(form, function(i, field) {
                selectoption = field.value;
                vote_id = field.name.substr(5,field.name.length);
            });
            console.log(selectoption);
            if(selectoption !== ''){
                var to = config.dappAddress;
                var value = "0";
                var callFunction = "voteToOneTheme";
                
                var callArgs =  '["'+vote_id+'","'+selectoption+'"]';
                serialNumber = nebPay.call(to, value, callFunction, callArgs, { //使用nebpay的simulateCall接口去执行get查询, 模拟执行.不发送交易,不上链
                    listener: function(info){
                        console.log(info.result);
                        $('#modal-container-370260').modal('hide');
                    },
                });
            }
        });
        $('#submit').on('click', function(){
            var formdata = getformdata();
            var to = config.dappAddress;
			var value = formdata.sum_money||0;
            var callFunction = "addVote";
            var key = getuuid();
            var details = options.map((i)=>{return {description: i.value, percent: 0,count: 0}}); 
            if(details.length < 2){
                alert('至少添加两个投票项');
                return;
            }
			var callArgs =  '["'+key+'",{"key":"'+key+'","title":"'+formdata.title+'","content":"'+formdata.content+'","current_user_voted":false,"voted_index":-1,"person_count":'+(formdata.person_count||0)+',"usr":"'+config.personalId+'","time":"2015/09/16","end_time":"'+formdata.end_time+'","public":'+formdata.public+',"apply_money":'+(formdata.apply_money || 0)+',"vote_count":0,"details":'+JSON.stringify(details)+'}]';
			serialNumber = nebPay.call(to, value, callFunction, callArgs, { //使用nebpay的simulateCall接口去执行get查询, 模拟执行.不发送交易,不上链
				listener: function(info){
                    console.log(info.result);
                    $('#modal-container-370260').modal('hide');
                    getVoting();
                    getUserVoteInfo();
                },
            });
            nebPay.queryPayInfo(serialNumber).then(function(res){
                console.log(res);
            });
        });
        
        // $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        //     console.log(e.target) // newly activated tab
        //     console.log(e.target.getAttribute('href')); // previous active tab
        //     getVoting(e.target.getAttribute('href'));
        //     if(e.target.getAttribute('href')!=='#panel-1')
        //     getUserVoteInfo(config.personalId);
        // })
        // if (typeof (webExtensionWallet) === "undefined") {
		// 	$("#header").style.display = "";
		// } else {
		// 	$("#addin").attr("disabled", false)
        // }
        getPaidVote();
        getVoting();
        var interval =  setInterval(function(){
            if(config.personalId !== ''){
                getUserVoteInfo(config.personalId);
                window.clearInterval(interval);
            }
        },100);
    }
    function payforVote(currentVote){
        var callArgs = '["'+currentVote.key+'"]'
        nebPay.call(config.dappAddress, currentVote.apply_money, 'payForVote', callArgs,{
            listener: function(info){
                console.log(info);
                getPaidVote();
            }
        } );
    }
    
    function getPaidVote(){
        var href = '#panel-4';
        var to = config.dappAddress;
        var value = '0';
        var callFunction = 'getPaidVote';
        var currentpage = 1;
        var pagesize = 10;
        var callArgs = '[]'
        nebPay.simulateCall(to, value, callFunction, callArgs, { //使用nebpay的simulateCall接口去执行get查询, 模拟执行.不发送交易,不上链
            listener: function(info){
                console.log(info);
                if(info.result !== '' && JSON.parse(info.result) !== 0){
                    var votelist = JSON.parse(info.result);
                    var str = '<table class="table table-striped"><thead><tr><th>编号</th><th>标题</th><th>操作</th></tr></thead><tbody>';
                    votelist.forEach(element => {
                        str+='<tr><td>'+element.key+'</td><td>'+element.title+'</td><td><a key="'+element.key+'" type="see">查看投票结果</a></td></tr>';
                    });
                    str+='</tbody></table>';
                    $(href).html(str);
                    bindEvent(href, votelist);
                }else{
                    str = '<p style="text-align:center;margin: 30px 0;">暂无数据</p>'
                    $(href).html(str);
                }
                
            } //指定回调函数
        });
    }
    function bindEvent(href, list){
        
        $(href).on('click', function(e){
            if(e.target.getAttribute('type')==='page'){
                return ;
            }
            if(e.target.getAttribute('key')){
                var currentVote = '';
                if(e.target.getAttribute('type') === 'seeMyVote'){ // 查看自己投过票的
                    currentVote = list.filter(item=>item.key === e.target.getAttribute('key'))[0];
                    $('#vote_title').html(currentVote.title);
                    $('#vote_content').html(currentVote.content);
                    var i = 0;
                    $('#myModalLabel').html('查看投票详情');
                    $('#vote_options').html(currentVote.details.map((item)=>{
                        return '<p><input type="radio"'+(i==currentVote.voted_index?'checked="checked"':'56')+' disabled="disabled" value="'+(i++)+'" name="radio'+currentVote.key+'"/>'+item.description+'</p>';
                    }).join(''));
                    $('#vote_button').addClass('hide');
                    $('#modal-container-784286').modal('show');
                }else{
                    currentVote = list.filter(item=>item.key === e.target.getAttribute('key'))[0];
                    $('#vote_title').html(currentVote.title);
                    $('#vote_content').html(currentVote.content);
                    var i = 0;
                    switch(e.target.getAttribute('type')){
                        case 'vote': // 投票
                            $('#vote_options').html(currentVote.details.map((item)=>{
                                return '<p><input type="radio" value="'+(i++)+'" name="radio'+currentVote.key+'"/>'+item.description+'</p>';
                            }).join(''));
                            $('#myModalLabel').html('投票');
                            $('#modal-container-784286').modal('show');
                            break;
                        case 'pay': // 付费查看
                            payforVote(currentVote);
                            break;
                        case 'see': // 查看自己发起的
                            $('#vote_options').html(currentVote.details.map((item)=>{
                                return '<p>'+item.description+'<span style="float:right;">共'+item.count+'票</span></p>';
                            }).join(''));
                            $('#myModalLabel').html('查看投票详情');
                            $('#vote_button').addClass('hide');
                            $('#modal-container-784286').modal('show');
                            break;                        
                    }
                }
                
            }
        });
    }
    function getUserVoteInfo(uid){
        var href1 = '#panel-2';
        var href2 = '#panel-3';
        var to = config.dappAddress;
        var value = '0';
        var callFunction = 'getUserVoteInfo';
        var currentpage = 1;
        var pagesize = 10;
        var callArgs = '["'+uid+'"]'
        nebPay.simulateCall(to, value, callFunction, callArgs, { //使用nebpay的simulateCall接口去执行get查询, 模拟执行.不发送交易,不上链
            listener: function(info){
                var str = '';
                var result = '';
                if(info.result === ''){
                    $(href1).html(common.tip);
                    $(href2).html(common.tip);
                }else{
                    result = JSON.parse(info.result);
                    if(result.my_votes && result.my_votes.length !== 0){
                        str = common.tableHeadHtml;
                        result.my_votes.forEach(element => {
                            str+='<tr><td>'+element.key+'</td><td>'+element.title+'</td><td>'+element.person_count+'</td><td>'+(typeof element.sum_money !== 'undefined' && parseInt(element.person_count)!==0?parseInt(element.sum_money)/parseInt(element.person_count)/1e18:0)+'</td><td>'+element.apply_money+'</td><td>'+element.apply_money+'</td><td><a key="'+element.key+'" type="see">查看投票结果</a></td></tr>'
                        });
                        str += common.tableFootHtml;
                        $(href1).html(str);
                        bindEvent(href1, result.my_votes);
                    }
                    else{
                        $(href1).html(common.tip);
                    }
                    if(result.voted_info && result.voted_info.length !== 0){
                        str = common.tableHeadHtml;
                        result.voted_info.forEach(element => {
                            str+='<tr><td>'+element.key+'</td><td>'+element.title+'</td><td>'+element.person_count+'</td><td>'+(typeof element.sum_money !== 'undefined' && parseInt(element.person_count)!==0?parseInt(element.sum_money)/parseInt(element.person_count)/1e18:0)+'</td><td>'+element.apply_money+'</td><td>'+element.apply_money+'</td><td>';
                            if(element.current_user_voted){
                                str+='<a key="'+element.key+'" type="seeMyVote">查看我的投票</a>'
                            }else{
                                str+='<a key="'+element.key+'" type="vote">投票</a><a key="'+element.key+'"type="pay">付费查看</a></td></tr>';
                            }
                            if(element.current_user_paid || element.usr === config.personalId){
                                str+='<a key="'+element.key+'"type="see">查看投票结果</a></td></tr>';
                            }else{
                                str+='<a key="'+element.key+'"type="pay">付费查看</a></td></tr>';
                            }
                        });
                        str += common.tableFootHtml;
                        $(href2).html(str);
                        bindEvent(href2, result.voted_info);
                    }else{
                        $(href2).html(common.tip);
                    }
                }
            } //指定回调函数
        });
    }
    function getVoting(page){
        var href = "#panel-1";
        var to = config.dappAddress;
        var value = '0';
        var callFunction = 'getMultiVotes';
        var currentpage = page || 1;
        var pagesize = 10;
        var callArgs = '["'+currentpage+'","'+pagesize+'"]';
        nebPay.simulateCall(to, value, callFunction, callArgs, { //使用nebpay的simulateCall接口去执行get查询, 模拟执行.不发送交易,不上链
            listener: function(info){
                if(info.result !== '' && JSON.parse(info.result).count !== 0){
                    var votelist = JSON.parse(info.result).info;
                    var count = JSON.parse(info.result).count;  
                    var str = common.tableHeadHtml;
                    votelist.forEach(element => {
                        str+='<tr><td>'+element.key+'</td><td>'+element.title+'</td><td>'+element.person_count+'</td><td>'+(typeof element.sum_money !== 'undefined' && parseInt(element.person_count)!==0?parseInt(element.sum_money)/parseInt(element.person_count)/1e18:0)+'</td><td>'+element.apply_money+'</td><td>';
                        if(element.current_user_voted){
                            str+='<a key="'+element.key+'" type="seeMyVote">查看我的投票</a>'
                        }else{
                            str+='<a key="'+element.key+'" type="vote">投票</a>';
                        }
                        if(element.current_user_paid || element.usr === config.personalId){
                            str+='<a key="'+element.key+'"type="see">查看投票结果</a></td></tr>';
                        }else{
                            if(element.public){
                                str+='<a key="'+element.key+'"type="see">查看投票结果</a></td></tr>';
                            }else{
                                str+='<a key="'+element.key+'"type="pay">付费查看</a></td></tr>';
                            }
                        }
                    });
                    str+=common.tableFootHtml;
                    
                    if(count > pagesize){
                        var pageno = Math.floor((count-1)/pagesize)+1; //总页数
                        str += '<ul id="pagination" class="pagination"><li><a key="'+(currentpage-1<0?0:currentpage-1)+'" type="page">&laquo;</a></li>'
                        for(let j = 1; j <= pageno; j++){
                            str += '<li><a key="'+(j)+'" type="page">'+(j)+'</a></li>';
                        }
                        str+='<li><a key="'+(currentpage+1>pageno?pageno:currentpage+1)+'" type="page">&raquo;</a></li></ul>'
                    }
                    $(href).html(str);
                    bindEvent(href, JSON.parse(info.result).info);
                    $('#pagination').on('click',function(e){
                        console.log('567890');
                        $(href).unbind();
                        if(e.target.getAttribute('key') && e.target.getAttribute('type')==='page'){
                            var key = e.target.getAttribute('key');
                            var type = e.target.getAttribute('type');
                            getVoting(parseInt(key));
                        }
                    });
                    
                }else{
                    str = '<p style="text-align:center;margin: 30px 0;">暂无进行中的投票</p>'
                    $(href).html(str);
                }
                
            } //指定回调函数
        });
    }
    function getformdata(){
        var formdata = {};
            var form = $('#publish_form').serializeArray();
            $.each(form, function(i, field) {
                formdata[field.name] = field.value;
            });
            if(formdata.public){
                formdata.public = !formdata.public==='on';
            }else{
                formdata.public = true;
            }
            return formdata;
    }
    // function getCount(){
    //     var to = config.dappAddress;
    //     var value = '0';
    //     var callFunction = 'getVoteCount';
    //     var callArgs =  '[]';
    //     nebPay.simulateCall(to, value, callFunction, callArgs, { //使用nebpay的simulateCall接口去执行get查询, 模拟执行.不发送交易,不上链
    //         listener: function(info){
    //             console.log(info.result);
    //         } //指定回调函数
    //     });
    // }
    function getuuid(){
        var s = [];
        var hexDigits = '0123456789abcdef';
        for (var i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[14] = '4';  // bits 12-15 of the time_hi_and_version field to 0010
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[8] = s[13] = s[18] = s[23] = '-';
        
        var uuid = s.join('');
        return uuid;
    }
    console.log('ok?');
});