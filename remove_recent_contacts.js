const db = require('./models');
const { Contact } = db;

// Remove the recently imported contacts
async function removeRecentContacts() {
    try {
        console.log('🔍 Checking recent contacts...');
        
        // Find contacts imported in the last few minutes
        const recentContacts = await Contact.findAll({
            where: {
                clientId: 1,
                createdAt: {
                    [db.Sequelize.Op.gte]: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
                }
            },
            attributes: ['id', 'name', 'phone', 'createdAt']
        });
        
        console.log(`📊 Found ${recentContacts.length} recent contacts to remove`);
        
        if (recentContacts.length > 0) {
            // Show first few contacts for confirmation
            console.log('🔍 Sample contacts to be removed:');
            recentContacts.slice(0, 5).forEach((contact, index) => {
                console.log(`   ${index + 1}. ${contact.name} - ${contact.phone}`);
            });
            
            if (recentContacts.length > 5) {
                console.log(`   ... and ${recentContacts.length - 5} more contacts`);
            }
            
            // Delete the contacts
            const deleteResult = await Contact.destroy({
                where: {
                    clientId: 1,
                    createdAt: {
                        [db.Sequelize.Op.gte]: new Date(Date.now() - 10 * 60 * 1000)
                    }
                }
            });
            
            console.log(`✅ Successfully removed ${deleteResult} contacts`);
            
            // Check final count
            const remainingCount = await Contact.count({ where: { clientId: 1 } });
            console.log(`📊 Remaining contacts in database: ${remainingCount}`);
            
        } else {
            console.log('ℹ️ No recent contacts found to remove');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error removing contacts:', error);
        process.exit(1);
    }
}

// Run the removal
removeRecentContacts();
