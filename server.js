var crypto = require('crypto');
var express = require('express')
var contract = require("truffle-contract");
var Web3 = require('web3');
var bodyParser = require('body-parser');
var uuidv4 = require('uuid/v4');

var addrs = require('./addrs');

var app = express();

var json = require("./build/contracts/hashlock.json");
var HashLockContract = contract(json);

// use ejs template engine
app.set('view engine', 'ejs');

// serve up static files from
app.use('/static',express.static('./node_modules'));
// serve up static files from public
app.use('/static',express.static('./public'));

// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var provider = new Web3.providers.HttpProvider("http://localhost:8545");
var web3 = new Web3(provider);
HashLockContract.setProvider(provider);

app.get('/setup',function(req,res){
	res.render('pages/setup');
});

app.post('/setup', function(req, res){
	var pw = req.body.password
	var generated = addrs.genPrivKey(pw, 'testnet')
	// this is bad. get working on client side with browserify
	res.send({
		code: generated.code,
		privkey: generated.privkey
	});
})

try{
	HashLockContract.deployed().then(function(instance){

		/**
		 * info about swap contract
		 */
		app.get('/api/swap', function (req, res) {
			res.send({
				address: instance.address,
			});
		});

		/**
		 * Generates a random UUID
		 */
		app.get('/api/random', function(req, res){
			res.send({
				random: uuidv4()
			});
		});

		/**
		 * Computes sha256 hash of data
		 */
		app.post('/api/hash', function(req, res){
			if(req.body['data']){
				var hash = crypto.createHash('sha256');
				hash.update(req.body.data);
				res.send({
					hash: "0x"+hash.digest('hex')
				});
			}else{
				res.send({
					error: 'data is not defined'
				});
			}
		});

		/**
		 * Get Swap info
		 */
		app.get('/api/swap/get/:id', function(req, res){

			instance.trades(req.params.id).then(function(tradeData){
				res.send({
					id: req.params.id,
					sender: tradeData[0],
         			redeemer: tradeData[1],
         			senderZAddr: tradeData[2],
         			redeemerZAddr: tradeData[3],
         			hash: tradeData[4],
        			amount: tradeData[5],
        			timeoutBlock: tradeData[6]
				});
			}).catch(function(err){
				res.send({
					error: err.toString()
				});
			});

		});

		/**
		 * Creates a "hash lock contract" between Alice and Bob
		 */
		/*app.post('/api/swap/lock', function(req, res){
			var hash = req.body.hash;
			var redeemer = req.body.redeemer;
			var sender = req.body.sender;
			var senderZAddr = req.body.senderZAddr;
			var redeemerZAddr = req.body.redeemerZAddr;
			var expiry = req.body.expiry;
			var amount = req.body.amount;
			instance.lock(hash, redeemer, expiry, senderZAddr, redeemerZAddr, {
				from: sender,
				value: amount,
				gas: 1248090
			}).then(function(result){
				res.send({
					tradeId: result.logs[0].args.trade_id,
					tx: result.tx
				});
			}).catch(function(err){
				res.send({
					error: err.toString()
				});
			});
		});*/

		/*app.post('/api/swap/unlock', function(req, res){
			var tradeId = req.body.tradeId;
			var preimage = req.body.preimage;
			var redeemer = req.body.redeemer;
			// can the redeemer be just the address, or must be accessed through web3?
			instance.unlock(tradeId, preimage, {
				from: redeemer,
				gas: 1248090
			}).then(function(result){
				res.send({
					tx: result.tx
				});
			}).catch(function(err){
				res.send({
					error: err.toString()
				});
			});
		});*/

		// pages

		app.get('/trade/:page',function(req,res){
			res.render('pages/trade/' + req.params.page);
		});

		app.listen(3000,function(){
			console.log("http://localhost:3000");
		});

	});
}catch(e){
	console.log(e);
	console.log("Try running truffle migrate.");
}
