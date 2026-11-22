package com.venchy.armeasure

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(ARMeasurePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
