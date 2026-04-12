const mysql = require('mysql2/promise');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const PASSWORD_HASH_ITERATIONS = 120000;

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(
        password,
        Buffer.from(salt, 'hex'),
        PASSWORD_HASH_ITERATIONS,
        32,
        'sha256'
    ).toString('hex');
    return { salt, hash };
}

async function main() {
    console.log('🚀 Démarrage du Massive Seeder (200k dossiers)...');
    
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cabinet_db'
    };

    const connection = await mysql.createConnection(dbConfig);

    try {
        console.log('🧹 Nettoyage des tables...');
        await connection.query('DELETE FROM dossiers');
        await connection.query('DELETE FROM clients');
        await connection.query('DELETE FROM users');

        // 1. Seed Users (55 total)
        console.log('👥 Création de 55 utilisateurs (30 Admins, 20 Clients, 5 Managers)...');
        const { salt, hash } = hashPassword('1234');
        const users = [];
        
        // 5 Managers
        for (let i = 1; i <= 5; i++) {
            users.push([i, `manager${i}`, hash, salt, 'manager', JSON.stringify({ requirePasswordChange: false })]);
        }
        // 30 Admins
        for (let i = 1; i <= 30; i++) {
            users.push([i + 5, `admin${i}`, hash, salt, 'admin', JSON.stringify({ requirePasswordChange: false })]);
        }
        // 20 Clients
        for (let i = 1; i <= 20; i++) {
            users.push([i + 35, `client_user${i}`, hash, salt, 'client', JSON.stringify({ requirePasswordChange: false, clientIds: [i] })]);
        }
        
        await connection.query('INSERT INTO users (id, username, passwordHash, passwordSalt, role, data) VALUES ?', [users]);

        // 2. Seed Client Entities (20 total)
        console.log('🏢 Création de 20 entités Clients...');
        const clients = [];
        for (let i = 1; i <= 20; i++) {
            clients.push([i, `Client Stress ${i}`]);
        }
        await connection.query('INSERT INTO clients (id, name) VALUES ?', [clients]);

        // 3. Seed Dossiers (200,000 total)
        console.log('📂 Création de 200,000 dossiers (Distribution: 360k audiences, 250k diligences)...');
        
        const TOTAL_DOSSIERS = 200000;
        const BATCH_SIZE = 2000;
        let audiencePool = 360000;
        let diligencePool = 250000;

        for (let i = 0; i < TOTAL_DOSSIERS; i += BATCH_SIZE) {
            const batch = [];
            for (let j = 0; j < BATCH_SIZE; j++) {
                const globalIndex = i + j;
                if (globalIndex >= TOTAL_DOSSIERS) break;

                const clientId = (globalIndex % 20) + 1;
                const refClient = `R-MASS-${String(globalIndex).padStart(7, '0')}`;
                const debiteur = `Débiteur Massive ${globalIndex}`;
                
                // Distribution logique pour atteindre les totaux
                const procedureDetails = {};
                let procName = 'ASS';
                
                // On met au moins 1 audience par dossier (total 200k)
                procedureDetails['ASS'] = { 
                    audience: '2026-09-12', 
                    juge: 'Juge Massive', 
                    tribunal: 'Casablanca', 
                    sort: (globalIndex % 10 === 0) ? 'Att sort' : 'En cours' 
                };
                
                // On rajoute 160k audiences extra (sur les dossiers impairs par exemple)
                if (globalIndex < 160000) {
                    procedureDetails['ASS 2'] = { audience: '2026-10-15', sort: 'En cours' };
                    procName += ', ASS 2';
                }

                // On met au moins 1 diligence par dossier (total 200k)
                procedureDetails['SFDC'] = { ville: 'Casablanca', statut: 'En cours' };
                procName += ', SFDC';

                // On rajoute 50k diligences extra
                if (globalIndex < 50000) {
                    procedureDetails['Commandement'] = { ville: 'Rabat', statut: 'En cours' };
                    procName += ', Commandement';
                }

                const dossierData = {
                    id: globalIndex + 1,
                    referenceClient: refClient,
                    debiteur: debiteur,
                    procedure: procName,
                    ville: 'Casablanca',
                    montant: '10000',
                    procedureDetails,
                    history: []
                };

                batch.push([clientId, refClient, debiteur, procName, JSON.stringify(dossierData)]);
            }
            
            await connection.query('INSERT INTO dossiers (clientId, referenceClient, debiteur, procedure_name, data) VALUES ?', [batch]);
            
            if (i % 20000 === 0) {
                console.log(`... [PROGRESS] ${i} / ${TOTAL_DOSSIERS} dossiers insérés`);
            }
        }

        console.log('✅ Seed terminé avec succès !');
        console.log(`📊 Résumé: 200k Dossiers, ~360k Audiences, ~250k Diligences.`);

    } catch (err) {
        console.error('❌ Erreur pendant le seeding:', err);
    } finally {
        await connection.end();
    }
}

main();
