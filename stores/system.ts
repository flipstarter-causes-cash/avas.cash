/* Import modules. */
import { defineStore } from 'pinia'

/* Import modules. */
import { encodeAddress } from '@nexajs/address'
import { getTransaction } from '@nexajs/rostrum'
import { binToHex } from '@nexajs/utils'
import { hexToBin } from '@nexajs/utils'
import { sha256 } from '@nexajs/crypto'

/* Libauth helpers. */
import { instantiateRipemd160 } from '@bitauth/libauth'

/* Libauth helpers. */
import {
    encodeDataPush,
} from '@bitauth/libauth'

/**
 * System Store
 */
export const useSystemStore = defineStore('system', {
    state: () => ({
        /* Set constants. */
        ONE_SAT: BigInt('1'),
        ONE_NEX: BigInt('100'),
        ONE_KEX: BigInt('100000'),
        ONE_MEX: BigInt('100000000'),
        ONE_META: BigInt('1000000000000000000'),

        /* Initialize notifications. */
        notif: {
            isShowing: false,
            icon: null,
            title: null,
            description: null,
            delay: 7000,
        },

        /**
         * Application Starts
         */
        _appStarts: 0,

        /**
         * Application Version
         */
        _appVersion: null,

        /**
         * Flags
         *
         * 1. Dark mode
         * 2. Unconfirmed transactions
         */
        _flags: null,

        /**
         * Locale
         *
         * Controls the localization language.
         * (default is english)
         */
        _locale: null,

        /**
         * Notices
         *
         * System notices that nag/remind the user of some important action or
         * information; which can be permanently disabled ("Do Not Show Again")
         * via checkbox and confirmation.
         *
         * NOTE: Unique 1-byte (hex) codes (up to 255) are used to reduce the size
         *       of this storage field.
         */
        _notices: null,

        /**
         * Tickers
         *
         * Support for multiple exchange tickers across multiple currencies.
         */
        _tickers: null,
    }),

    getters: {
        avasUsd() {
            if (!this._tickers?.AVAS) {
                return null
            }

            return this._tickers.AVAS.price
        },

        nex() {
            if (!this._tickers?.NEXA) {
                return null
            }

            return this._tickers.NEXA.quote.USD.price
        },

        usd() {
            if (!this.nex) {
                return null
            }

            return this.nex * 10**6
        },

        locale() {
            if (!this._locale) {
                return null
            }

            return this._locale
        },

    },

    actions: {
        /**
         * Initialize Application
         *
         * Performs startup activities.
         */
        init() {
            this._appStarts++

            if (!this._tickers) {
                this._tickers = {}
            }

            setInterval(this.updateTicker, 30000)

            this.updateTicker()

            if (this._locale === null) {
                /* Set (library) locale from (store) locale. */
                this._locale = navigator.language || navigator.userLanguage
                console.log(`User's preferred language is:`, this._locale)
            }

            console.log('LOCALE', this.locale)
        },

        async updateTicker () {
            if (!this._tickers.AVAS) {
                this._tickers.AVAS = {}
            }

            if (!this._tickers.NEXA) {
                this._tickers.NEXA = {}
            }

            this._tickers.AVAS = await $fetch('https://nexa.exchange/v1/ticker/quote/57f46c1766dc0087b207acde1b3372e9f90b18c7e67242657344dcd2af660000')

            this._tickers.NEXA = await $fetch('https://nexa.exchange/ticker')
        },

        async getSender(_tx) {
            const inputs = _tx?.vin
            // console.log('INPUTS', inputs)

            const hex = inputs[0]?.scriptSig.hex
            // console.log('HEX', hex)

            const publicKey = hexToBin(hex.slice(4, 70))
            // console.log('PUBLIC KEY', binToHex(publicKey))

            /* Hash the public key hash according to the P2PKH/P2PKT scheme. */
            const scriptPushPubKey = encodeDataPush(publicKey)
            // console.log('SCRIPT PUSH PUBLIC KEY', scriptPushPubKey);

            const ripemd160 = await instantiateRipemd160()

            const publicKeyHash = ripemd160.hash(sha256(scriptPushPubKey))
            // console.log('PUBLIC KEY HASH (hex)', binToHex(publicKeyHash))

            const pkhScript = hexToBin('17005114' + binToHex(publicKeyHash))
            // console.info('  Public key hash Script:', binToHex(pkhScript))

            const address = encodeAddress(
                'nexa', 'TEMPLATE', pkhScript)
            console.info('ADDRESS', address)

            /* Set sender. */
            const sender = {
                address,
                inputs,
            }

            /* Return sender. */
            return sender
        },

    },
})
