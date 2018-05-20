"use strict";
/******************************投票选项对象**************************************/
var themeItem = function(text){
		if(text){
			var obj = JSON.parse(text);
			this.description = obj.description;
			this.percent = obj.percent;
			this.count = obj.count;
		}
		else{
			this.description = "";
			this.percent = 0;
			this.count = 0;
		}
	};
	themeItem.prototype = {
		toString:function(){
			return JSON.stringify(this);
		}
	};
/******************************投票对象**************************************/
	var voteItem = function(text){
		if(text){
			var obj = JSON.parse(text);
			this.key=obj.key;
			this.title=obj.title;
			this.content=obj.content;
			this.usr=obj.usr;
			this.sum_money = obj.sum_money;
			this.person_count = obj.person_count;
			this.current_user_voted = obj.current_user_voted;
			this.current_user_paid = obj.current_user_paid;
			this.voted_index = obj.voted_index;
			this.time=obj.time;
			this.end_time = obj.end_time;
			this.public=obj.public;
			this.apply_money=obj.apply_money;
			this.vote_count=obj.vote_count;
			this.details=obj.details;
		}
		else{
			this.key="";
			this.title="";
			this.content="";
			this.usr="";
			this.sum_money = 0;
			this.person_count = 0;
			this.current_user_voted = false;
			this.current_user_paid = false;
			this.voted_index =-1;
			this.time="";
			this.end_time = "";
			this.public=true;
			this.apply_money=0;
			this.vote_count=0;
			this.details=[];
		}
	};
	voteItem.prototype={
		toString:function(){
			var text = JSON.stringify(this);
			return text;
		}
	};
/******************************用户投票信息（发起了哪些，投了哪些）**************************************/
	var userVotedInfoItem = function(text){
		if(text){
			var obj = JSON.parse(text);
			this.votes = obj.votes;
			this.voted = obj.voted;
		}
		else{
			this.votes = [];
			this.voted = [];
		}
	};
	userVotedInfoItem.prototype={
		toString:function(){
			return JSON.stringify(this);
		}
	};
/******************************一个投票被多少人投票以及投票时间的信息{user,index,time}**************************************/
var votedInfoItem = function(text){
		if(text){
			var obj = JSON.parse(text);
			this.info = obj.info;
		}
		else{
			this.info = [];
		}
	};
	votedInfoItem.prototype={
		toString:function(){
			return JSON.stringify(this);
		}
	};
/******************************需付费查看信息的投票已付费的用户**************************************/
var usersAllowedVoteItem = function(text){
		if(text){
			var obj = JSON.parse(text);
			this.users = obj.users;
		}
		else{
			this.users = [];
		}
	};
	usersAllowedVoteItem.prototype={
		toString:function(){
			return JSON.stringify(this);
		}
	};
/******************************smartContract item**************************************/
	var VoteContract = function () {
		LocalContractStorage.defineProperty(this, "voteSize");
		LocalContractStorage.defineMapProperty(this, "voteKeyArray");
		LocalContractStorage.defineMapProperty(this, "paidVotes");
		LocalContractStorage.defineMapProperty(this, "moneyForVote");
		LocalContractStorage.defineMapProperty(this, "votes", {
			parse: function (str) {
				return new voteItem(str);
			},
			stringify: function (item) {
				return item.toString();
			}
		});
		//用户投票信息存储
		LocalContractStorage.defineMapProperty(this,"userInfoForVote",{
			parse: function (str) {
				return new userVotedInfoItem(str);
			},
			stringify: function (item) {
				return item.toString();
			}
		});
		//一个投票被多少人投
		LocalContractStorage.defineMapProperty(this,"votedInfo",{
			parse: function (str) {
				return new votedInfoItem(str);
			},
			stringify: function (item) {
				return item.toString();
			}
		});
		//需付费的vote_id,以及已付费的用户
		LocalContractStorage.defineMapProperty(this,"activeUserForVote",{
			parse: function (str) {
				return new usersAllowedVoteItem(str);
			},
			stringify: function (item) {
				return item.toString();
			}
		});
	};
	VoteContract.prototype = {
		init: function () {
			this.voteSize = 0;
		},
		addVote:function(k,v){
			k = k.trim();
			//v = v.toString().trim();
			if(k === ""){
            	throw new Error("empty key");
			}
			else if(this.votes.get(k) !== null){
            	throw new Error("key exists");
			}
        	var value = Blockchain.transaction.value;
			var index = this.voteSize;
			this.voteKeyArray.set(index,k);

			//记录当前用户发起了哪些投票
        	var uid = Blockchain.transaction.from;
        	var user_vote_info = this.userInfoForVote.get(uid);
        	if(user_vote_info === null){
        		user_vote_info = new userVotedInfoItem();
        	}
        	user_vote_info.votes.push(v.key);
        	this.userInfoForVote.set(uid,user_vote_info);

        	//记录当前vote 剩余的nas
        	if(v.person_count > 0){
        		this.moneyForVote.set(v.key,{remain:v.person_count,averyage:value/v.person_count});
        	}
			var vote = new voteItem();
			vote.key=v.key;
			vote.title=v.title;
			vote.content=v.content;
			vote.usr=v.usr;
			vote.sum_money = value;
			vote.person_count = v.person_count;
			vote.current_user_voted = v.current_user_voted;
			vote.voted_index = v.voted_index;
			vote.current_user_paid = v.current_user_paid;
			vote.time=v.time;
			vote.end_time = v.end_time;
			vote.public=v.public;
			vote.apply_money=v.apply_money;
			vote.vote_count=v.vote_count;
			vote.details=v.details;
			//throw new Error(vote);
			this.votes.set(k,vote);
			this.voteSize += 1;
		},
		_convertVoteForUser:function(vote,uid){
			var voted_votes = [];
        	var user_voted_info = this.userInfoForVote.get(uid);
        	//return user_voted_info;
        	if(user_voted_info !== null){
        		for(var dex=0;dex<user_voted_info.voted.length;++dex){
        			voted_votes.push({vote_id:user_voted_info.voted[dex].vote_id,theme_index:user_voted_info.voted[dex].theme_index});
        		}
        	}
        	for(var k=0;k<voted_votes.length;++k){
        		if(voted_votes[k].vote_id === vote.key){
        			vote.current_user_voted = true;
        			vote.voted_index = voted_votes[k].theme_index;
        		}
        	}
        	var paid = false;
        	var userPaidVote  = this.paidVotes.get(uid);
        	if(userPaidVote !== null){
        		for(var i=0;i<userPaidVote.length;++i){
        			if(vote.key === userPaidVote[i]){
        				paid = true;
        				break;
        			}
        		}
        	}
        	vote.current_user_paid = paid;
        	if(vote.usr !== uid && !vote.public && !paid){
        		var details = vote.details;
        		for(var j=0;j<details.length;++j){
        			details[j].count = 0;
        			details[j].percent = 0;
        		}
        		vote.details = details;
        	}
        	return vote;
		},
		getVoteByKey:function(k){
        	var uid = Blockchain.transaction.from;
			var obj = this.votes.get(k);
       		return this._convertVoteForUser(obj,uid);
		},
		getMultiVotes:function(page,count){
			page = parseInt(page);
			count = parseInt(count);
			if((page - 1) * count >= this.voteSize){
				return {info:[],count:0};
			}
			var voteObjs=[];
        	//return voted_votes;
			for(var i = (page - 1) * count;i < (page - 1) * count + count; ++i){
				if(i >= this.voteSize){
					break;
				}
				var key = this.voteKeyArray.get(i);
				var obj = this.votes.get(key);
        		var uid = Blockchain.transaction.from;
        		obj = this._convertVoteForUser(obj,uid);
				voteObjs.push(obj);
			}
			return {info:voteObjs,count:this.voteSize};
		},
		getVoteCount:function(){
			return this.voteSize;
		},
		getUserVoteInfo:function(uid){
			var info = function(){
				this.voted_info=[];
				this.my_votes=[];
			}
			var user_vote_info = new info();
			var info_by_id = this.userInfoForVote.get(uid);
			//return info_by_id;
			if(info_by_id === null){
				return user_vote_info;
			}

			var voted_votes = [];
			var user_voted_info = this.userInfoForVote.get(uid);
        	if(user_voted_info !== null){
        		for(var dex=0;dex<user_voted_info.voted.length;++dex){
        			voted_votes.push({vote_id:user_voted_info.voted[dex].vote_id,theme_index:user_voted_info.voted[dex].theme_index});
        		}
        	}

			for(var i=0;i<info_by_id.votes.length;++i){
				var vote = this.votes.get(info_by_id.votes[i]);
				if(vote === null){
					continue;
				}
				vote = this._convertVoteForUser(vote,uid);
				user_vote_info.my_votes.push(vote);
			}
			for(var i=0;i<info_by_id.voted.length;++i){
				var vote = this.votes.get(info_by_id.voted[i].vote_id);
				vote = this._convertVoteForUser(vote,uid);
				user_vote_info.voted_info.push(vote);
			}
			return user_vote_info;
		},
		voteToOneTheme:function(vote_id,theme_index){
			var vote_obj = this.votes.get(vote_id);
			if(vote_obj === null){
				throw new Error("can not find vote by id: " + vote_id);
			}
			if(theme_index >= vote_obj.details.length){
				throw new Error("theme index is out of range");
			}
			vote_obj.vote_count += 1;
			for(var i=0;i<vote_obj.details.length;++i){
				if(i === theme_index){
					vote_obj.details[i].count += 1;
				}
				vote_obj.details[i].percent = vote_obj.details[i].count / vote_obj.vote_count;
			}
			this.votes.set(vote_id,vote_obj);

			//记录当前用户投了哪些票
        	var uid = Blockchain.transaction.from;
			var user_vote_info = this.userInfoForVote.get(uid);
        	if(user_vote_info === null){
        		user_vote_info = new userVotedInfoItem();
        	}
        	user_vote_info.voted.push({vote_id:vote_id,theme_index:theme_index});
        	this.userInfoForVote.set(uid,user_vote_info);

        	//记录当前投票被哪些人投票
        	var info_for_vote = this.votedInfo.get(vote_id);
        	if(info_for_vote === null){
        		info_for_vote = new votedInfoItem();
        	}
        	info_for_vote.info.push(uid);
        	this.votedInfo.set(vote_id,info_for_vote);

        	//付费给投票的人
        	var money_info = this.moneyForVote.get(vote_id);
        	if(money_info === null){
        		throw new Error("bad vote id");
        	}
        	if(money_info.remain === 0){
        		throw new Error("there has no money remaining");
        	}
        	var result = Blockchain.transfer(uid, money_info.averyage);
        	if (!result) {
            	Event.Trigger("transferFailed", {
                	Transfer: {
                    	from: Blockchain.transaction.to,
                    	to: uid,
                    	value: money_info.averyage
                	}
            	});
            	throw new Error("transfer failed");
        	}
        	money_info.remaining -= 1;
        	this.moneyForVote.set(vote_id,money_info);
		},
		payForVote:function(vote_id){
        	var uid = Blockchain.transaction.from;
        	var value = Blockchain.transaction.value;
        	if(value <= 0){
        		throw new Error("value is not correct");
        	}
        	var vote = this.votes.get(vote_id);
        	if(vote === null){
        		throw new Error("bad vote for vote_id: " + vote_id);
        	}
        	var usr = vote.usr;
        	var result = Blockchain.transfer(usr,value);
        	if (!result) {
            	Event.Trigger("transferFailed", {
                	Transfer: {
                    	from: Blockchain.transaction.to,
                    	to: uid,
                    	value: money_info.averyage
                	}
            	});
            	throw new Error("transfer failed");
        	}
        	var obj = this.paidVotes.get(uid);
        	if(obj === null){
        		obj = [];
        	}
        	if(obj.indexOf(vote_id) >= 0){
        		return;
        	}
        	obj.push(vote_id);
        	this.paidVotes.set(uid,obj);
		},
		getPaidVote:function(){
        	var uid = Blockchain.transaction.from;
        	var paid_ids = this.paidVotes.get(uid);
        	if(paid_ids === null){
        		return [];
        	}
        	var values = [];
        	for(var i=0;i<paid_ids.length;++i){
        		var obj = this.votes.get(paid_ids[i]);
        		obj = this._convertVoteForUser(obj,uid);
        		values.push(obj);
        	}
			return values;
		}
	};
module.exports = VoteContract;
