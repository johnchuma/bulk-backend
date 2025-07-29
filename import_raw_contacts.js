const csv = require('csv-parser');
const fs = require('fs');
const db = require('./models');
const { Contact } = db;

// Import contacts from CSV file
async function importContacts() {
    try {
        const contacts = [];
        const contactSet = new Set(); // To track duplicates
        
        // Read CSV file
        const stream = fs.createReadStream('../cleaned_raw_contacts.csv')
            .pipe(csv())
            .on('data', (row) => {
                const name = row.name?.trim();
                const phone = row.phone?.trim();
                
                if (name && phone) {
                    // Create unique key to check for duplicates
                    const uniqueKey = `${name}-${phone}`;
                    
                    if (!contactSet.has(uniqueKey)) {
                        contactSet.add(uniqueKey);
                        contacts.push({
                            name,
                            phone,
                            clientId: 1, // Assign to client ID 1
                            group: 'CCM Members',
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                }
            })
            .on('end', async () => {
                console.log(`📊 Processed ${contacts.length} unique contacts from CSV`);
                
                // Check existing contacts to avoid duplicates
                console.log('🔍 Checking for existing contacts...');
                const existingContacts = await Contact.findAll({
                    where: { clientId: 1 },
                    attributes: ['phone']
                });
                
                const existingPhones = new Set(existingContacts.map(c => c.phone));
                
                // Filter out contacts that already exist
                const newContacts = contacts.filter(contact => !existingPhones.has(contact.phone));
                
                console.log(`📊 Found ${existingContacts.length} existing contacts`);
                console.log(`📊 ${newContacts.length} new contacts to import`);
                
                if (newContacts.length > 0) {
                    // Import contacts in batches of 100
                    const batchSize = 100;
                    let imported = 0;
                    
                    for (let i = 0; i < newContacts.length; i += batchSize) {
                        const batch = newContacts.slice(i, i + batchSize);
                        await Contact.bulkCreate(batch);
                        imported += batch.length;
                        console.log(`✅ Imported batch: ${imported}/${newContacts.length} contacts`);
                    }
                    
                    console.log(`🎉 Successfully imported ${imported} new contacts!`);
                } else {
                    console.log('ℹ️ No new contacts to import');
                }
                
                // Final count
                const totalContacts = await Contact.count({ where: { clientId: 1 } });
                console.log(`📊 Total contacts in database: ${totalContacts}`);
                
                process.exit(0);
            });
    } catch (error) {
        console.error('❌ Error importing contacts:', error);
        process.exit(1);
    }
}

// Run the import
importContacts();
