<template>
    <div class="p-5 mb-4 bg-light rounded-3">
        <div class="container-fluid py-5">
            <img class="bog-roll" src="/zap.jpeg">
            <div class="col-md-8 fs-4">                
                <p class="text-muted text-end fs-6"><span class="fancy-font">PayAuth</span>  by three</p>
            </div>
            <div class="col-12 fs-6 mb-5">
                <h3>Deposit Authorization</h3>
                <p v-if="depositAuth">To receive money from payment transactions as you have <em>Deposit Authorization</em> enabled, <strong>you must preauthorize the senders of those Payments</strong>. Any payments from an account not in the list will be rejected.</p><p v-if="depositAuth">If you are having difficulty sending a payment to your account you can temporarily disable the <em>Deposit Authorization</em>.</p>
                <p v-if="!depositAuth">Is not enabled there is no restriction to which accounts can send your account a payment.</p>
            </div>

            <div class="input-group">
                <input type="text" class="form-control" aria-label="Default" aria-describedby="auth-address" placeholder="rAddress to authorize" v-model="auth">
                <button class="btn btn-sm btn btn-primary" @click="authButton()">authorize</button>
            </div>

            <div v-if="Object.keys(accountObjects).length > 0" class="col-12 fs-6 mt-5 mb-5">
                <h5>Authorized Accounts</h5>
                
                <div v-for="account in accountObjects"> <button class="mt-2 btn btn-sm btn btn-outline-primary" @click="removeButton(account.Authorize)">{{ account.Authorize }}</button></div>
                <small>tap to remove accounts</small>
            </div>
            <div v-if="Object.keys(accountObjects).length === 0" class="col-12 fs-6 mt-5 mb-5">
                <h5>Authorized Accounts</h5>
                <p v-if="depositAuth" class="text-danger">No account can make a payment to this wallet.</p>
                <p v-if="!depositAuth">Add accounts that can make payments to this wallet.</p>
            </div>

            <div class="col-12 fs-6 mb-5">
                <button :class="depositAuth ? 'btn btn-sm btn-danger':'btn btn-sm btn-primary'" @click="authEnableButton()">{{ depositAuth ? 'Disable Deposit Authorization': 'Enable Deposit Authorization' }}</button>
            </div>
        </div>
    </div>
</template>

<script>
    import decimal from 'decimal.js'
    import api from 'ripple-address-codec'
    const xapp = window.xAppSdk

    export default {
        name: 'Landing',
        props: ['client', 'Sdk', 'nodetype', 'qr_scan'],
        emits: ['clear'],
        data() {
            return {
                auth: undefined,
                isLoading: true,
                depositAuth: false,
                accountObjects: {}
            }
        },
        async mounted() {
            console.log('landing mounted...')
            // await this.fetchStorage()
            if (this.$store.getters.getAccount != '') {
                console.log('getAccount', this.$store.getters.getAccount)
                await this.getAccountInfo()
                await this.getAccountObjects()
            }
            this.isLoading = false
        },
        computed: {
            ledger() {
                return this.$store.getters.getLedger
            },
            account() {
                return this.$store.getters.getAccount
            },
            columns() {
                if (this.TokenOffers.length == 0) {
                    return []
                }
                return ['Side', 'NFT']
                //return Object.keys(this.TokenOffers[0]).filter( code => code !== 'ledger')
            }
        },
        watch: {
            async account() {
                if (this.$store.getters.getAccount != '') {
                    console.log('account loaded', this.$store.getters.getAccount)
                }
            },
            async qr_scan() {
                console.log('qr_scan passed', this.qr_scan)
                if (this.qr_scan !== undefined) {
                    const account = this.qr_scan
                    console.log('isValidAddress', api.isValidClassicAddress(account))
                    if (!api.isValidClassicAddress(account)) {
                        this.$emit('clear', true)
                    }
                    
                    for (const account of Object.keys(this.accountObjects.account_objects)) {
                        if (account.Authorize !== account) { continue }
                        console.log('account already is white listed')
                        this.$emit('clear', true)
                        return
                    }

                    this.authButton(account)
                    this.$emit('clear', true)
                }
            }
        },
        methods: {
            async getAccountObjects() {
                const acc_payload = {
                    'id': 0,
                    'command': 'account_objects',
                    'account': this.$store.getters.getAccount,
                    'ledger_index': 'validated',
                    'type': 'deposit_preauth',
                    'deletion_blockers_only': false,
                    'limit': 100
                }
                const account_objects = await this.client.send(acc_payload)
                console.log('account_objects', account_objects)
                this.accountObjects = account_objects.account_objects
            },
            async getAccountInfo() {
                const acc_payload = {
                    'id': 1,
                    'command': 'account_info',
                    'account': this.$store.getters.getAccount,
                    'ledger_index': 'validated'
                }
                const account_info = await this.client.send(acc_payload)
                console.log('account_info', account_info)
                if ('error' in account_info) { return }
                this.depositAuth = account_info.account_flags.depositAuth
            },
            async removeButton(account) {
                const acc_payload = {
                    'id': 1,
                    'command': 'account_info',
                    'account': this.$store.getters.getAccount,
                    'ledger_index': 'validated'
                }
                const account_info = await this.client.send(acc_payload)
                console.log('account_info', account_info)
                const tx_json = {
                    'TransactionType' : 'DepositPreauth',
                    'Account' : this.$store.getters.getAccount,
                    'Unauthorize' : account,
                    'Fee': await this.Fee(),
                    'Sequence': account_info.account_data.Sequence
                }
                console.log('auth', tx_json)


                const request = { custom_meta: { instruction: `Authorize Account for Deposits`}, txjson: tx_json}
                
                console.log('request', request)
                const payload = await this.Sdk.payload.createAndSubscribe(request, async event => {
                    console.log('New payload event:', event.data)

                    if (event.data.signed === true) {
                        console.log('Woohoo! The sign request was signed :)')
                        // need to trigger fetching auth object from ledger
                        return event.data
                    }

                    if (event.data.signed === false) {
                        console.log('The sign request was rejected :(')
                        return false
                    }
                })
                console.log('payload', payload)

                xapp.openSignRequest({ uuid: payload.created.uuid })
                await this.getAccountInfo()
                await this.getAccountObjects()
            },
            async authButton(account) {
                const acc_payload = {
                    'id': 1,
                    'command': 'account_info',
                    'account': this.$store.getters.getAccount,
                    'ledger_index': 'validated'
                }
                const account_info = await this.client.send(acc_payload)
                console.log('account_info', account_info)
                const tx_json = {
                    'TransactionType' : 'DepositPreauth',
                    'Account' : this.$store.getters.getAccount,
                    'Authorize' : account === undefined ? this.auth: account,
                    'Flags' : 2147483648,
                    'Fee': await this.Fee(),
                    'Sequence': account_info.account_data.Sequence
                }
                console.log('auth', tx_json)


                const request = { custom_meta: { instruction: `Authorize Account for Deposits`}, txjson: tx_json}
                
                console.log('request', request)
                const payload = await this.Sdk.payload.createAndSubscribe(request, async event => {
                    console.log('New payload event:', event.data)

                    if (event.data.signed === true) {
                        console.log('Woohoo! The sign request was signed :)')
                        // need to trigger fetching auth object from ledger
                        return event.data
                    }

                    if (event.data.signed === false) {
                        console.log('The sign request was rejected :(')
                        return false
                    }
                })
                console.log('payload', payload)

                xapp.openSignRequest({ uuid: payload.created.uuid })
                await this.getAccountInfo()
                await this.getAccountObjects()
            },

            async authEnableButton() {
                const acc_payload = {
                    'id': 1,
                    'command': 'account_info',
                    'account': this.$store.getters.getAccount,
                    'ledger_index': 'validated'
                }
                const account_info = await this.client.send(acc_payload)
                console.log('account_info', account_info)

                const tx_json = {
                    'TransactionType' : 'AccountSet',
                    'Account' : this.$store.getters.getAccount,
                    'Fee': await this.Fee(),
                    'Sequence': account_info.account_data.Sequence
                }

                if (this.depositAuth) {
                    tx_json.ClearFlag = 9
                }
                else {
                    tx_json.SetFlag = 9
                }
                console.log('auth', tx_json)

                const request = { custom_meta: { instruction: `Enable Deposit Authorization`}, txjson: tx_json}
                
                console.log('request', request)
                const payload = await this.Sdk.payload.createAndSubscribe(request, async event => {
                    console.log('New payload event:', event.data)

                    if (event.data.signed === true) {
                        console.log('Woohoo! The sign request was signed :)')
                        // need to trigger fetching auth object from ledger
                        return event.data
                    }

                    if (event.data.signed === false) {
                        console.log('The sign request was rejected :(')
                        return false
                    }
                })
                console.log('payload', payload)

                xapp.openSignRequest({ uuid: payload.created.uuid })
                await this.getAccountInfo()
                await this.getAccountObjects()
            },
            async Fee() {
                const server_info = await this.client.send({ 'command': 'server_info' })
                if ('error' in server_info) {
                    log('error server_info', server_info)
                    return
                }
                if (server_info.load_factor == null) {
                    // https://github.com/ripple/rippled/issues/3812#issuecomment-816871100
                    server_info.load_factor = 1
                }
                const FEE_CUSHION = 1.2
                const base_fee = new decimal(server_info.info.validated_ledger.base_fee_xrp).mul(server_info.load_factor).mul(FEE_CUSHION).mul(1_000_000).toFixed(0)
                console.log('FEE', base_fee)
                return base_fee
            },
            ledgerEpoch() {
                const unix_time = Date.now() 
                return Math.floor((unix_time) / 1000) - 946684800
            },
            currencyHexToUTF8(code) {
				if (code.length === 3)
					return code

				let decoded = new TextDecoder()
					.decode(this.hexToBytes(code))
				let padNull = decoded.length

				while (decoded.charAt(padNull - 1) === '\0')
					padNull--

				return decoded.slice(0, padNull)
			},
            hexToBytes(hex) {
				let bytes = new Uint8Array(hex.length / 2)

				for (let i = 0; i !== bytes.length; i++) {
					bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
				}

				return bytes
			}
        },
    }
</script>
<style scoped>
    .fancy-font {
        font-family: 'Permanent Marker', serif;
    }

    .bog-roll {
        width: 100%;
    }
    .main-text {
        color: #753ee2;
        -webkit-text-stroke-width: 1px;
        -webkit-text-stroke-color: black;
    }
    .btn-purple {
        background-color: #753ee2;
        color: #ffffff;
    }

    .btn-yellow {
        background-color: #ffc107;
        color: #ffffff;
    }
    .btn-pink {
        background-color: #ff1a8b;
        color: #ffffff;
    }

    .btn-green {
        background-color: #00e56a;
        color: #ffffff;
    }

    .table-warning {
        --bs-table-bg: #f6da86;
        color: #000;
        border-color: #e6dbb9;
    }
</style>
