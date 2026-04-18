const mongoose = require('mongoose');

const uri = "mongodb+srv://231b187_db_user:Sonai%400104@cluster0.awfpttz.mongodb.net/rebin?retryWrites=true&w=majority&appName=Cluster0";

async function deleteUser() {
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;
        const Users = db.collection('users');
        
        const result = await Users.deleteOne({
            $or: [
                { name: "121212#121" },
                { username: "121212#121" },
                { email: "121212#121" },
                { phone: "121212#121" }
            ]
        });
        
        console.log(`Deleted ${result.deletedCount} user(s).`);
        mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
deleteUser();
