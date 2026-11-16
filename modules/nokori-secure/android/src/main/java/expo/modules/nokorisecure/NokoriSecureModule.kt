package expo.modules.nokorisecure

import android.view.WindowManager
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Masque l'app dans l'écran des apps récentes (et bloque les captures) quand le verrouillage est activé.
 * Uniquement FLAG_SECURE : aucune permission, aucune détection de capture d'écran.
 */
class NokoriSecureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NokoriSecure")

    AsyncFunction("setSecure") { on: Boolean ->
      val window = appContext.currentActivity?.window ?: return@AsyncFunction
      if (on) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
      else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }.runOnQueue(Queues.MAIN)
  }
}
