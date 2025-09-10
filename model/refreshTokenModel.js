const {Schema, model} = require('mongoose');

const refreshToken = new Schema({
    tokenId:{
        type:String,
        required:true,
        unique:true
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true,
        index:true
    },
    tokenHash:{
        type:String,
        required:true,
    },
    deviceInfo:{
    type:String,
    required:false,
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    expiresAt:{
        type:Date,
        required: true
    },
    updatedAt:{
        type:Date,
        default:Date.now
    },
    revoked:{
        type:Boolean,
        default:false
    }
})
refreshToken.index({expiresAt:1},{expireAfterSeconds:0});
// allow multiple refresh tokens per user (different devices/sessions)
refreshToken.index({userId:1});

module.exports = model('RefreshToken', refreshToken);
