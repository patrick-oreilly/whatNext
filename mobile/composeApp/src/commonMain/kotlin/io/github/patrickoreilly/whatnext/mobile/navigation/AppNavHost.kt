package io.github.patrickoreilly.whatnext.mobile.navigation

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute

@Composable
fun AppNavHost(startDestination: Route = Route.Home) {
    val navController = rememberNavController()
    NavHost(
        navController = navController,
        startDestination = startDestination,
    ) {
        composable<Route.Home> {
            Text("Home")
        }
        composable<Route.CreateRoom> {
            Text("Create Room")
        }
        composable<Route.JoinRoom> {
            Text("Join Room")
        }
        composable<Route.Lobby> { backStackEntry ->
            val route: Route.Lobby = backStackEntry.toRoute()
            Text("Lobby: ${route.roomId}")
        }
        composable<Route.Game> { backStackEntry ->
            val route: Route.Game = backStackEntry.toRoute()
            Text("Game: ${route.roomId}")
        }
        composable<Route.GameOver> { backStackEntry ->
            val route: Route.GameOver = backStackEntry.toRoute()
            Text("Game Over: ${route.roomId}")
        }
    }
}
