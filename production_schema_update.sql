-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: karaoke-hub
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `avatars`
--

DROP TABLE IF EXISTS `avatars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `avatars` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `type` varchar(50) NOT NULL DEFAULT 'basic',
  `rarity` varchar(50) NOT NULL DEFAULT 'common',
  `imageUrl` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `coinPrice` int NOT NULL DEFAULT '0',
  `isAvailable` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `isFree` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `microphones`
--

DROP TABLE IF EXISTS `microphones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `microphones` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('basic','vintage','modern','wireless','premium','golden') NOT NULL DEFAULT 'basic',
  `rarity` enum('common','uncommon','rare','epic','legendary') NOT NULL DEFAULT 'common',
  `imageUrl` varchar(255) NOT NULL,
  `isAvailable` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `isUnlockable` tinyint NOT NULL DEFAULT '0',
  `unlockRequirement` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `coinPrice` int NOT NULL DEFAULT '0',
  `isFree` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `coin_packages`
--

DROP TABLE IF EXISTS `coin_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coin_packages` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `coinAmount` int NOT NULL,
  `priceUSD` decimal(8,2) NOT NULL,
  `bonusCoins` int NOT NULL DEFAULT '0',
  `isActive` tinyint NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `description` varchar(255) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` varchar(36) NOT NULL,
  `type` enum('coin_purchase','microphone_purchase','reward','refund') NOT NULL,
  `status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `coinAmount` int NOT NULL,
  `priceUSD` decimal(8,2) DEFAULT NULL,
  `stripePaymentIntentId` varchar(255) DEFAULT NULL,
  `userId` varchar(255) NOT NULL,
  `coinPackageId` varchar(255) DEFAULT NULL,
  `microphoneId` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `stripeSessionId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_6bb58f2b6e30cb51a6504599f41` (`userId`),
  KEY `FK_303125ec0a5667a804fba615d52` (`coinPackageId`),
  CONSTRAINT `FK_303125ec0a5667a804fba615d52` FOREIGN KEY (`coinPackageId`) REFERENCES `coin_packages` (`id`),
  CONSTRAINT `FK_6bb58f2b6e30cb51a6504599f41` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_avatars`
--

DROP TABLE IF EXISTS `user_avatars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_avatars` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `avatarId` varchar(50) NOT NULL,
  `acquiredAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_8e1c8161ffe23571cc8e52fe7a` (`userId`,`avatarId`),
  KEY `FK_4a5bcb3b5e5a0a7fc455c8403d4` (`avatarId`),
  CONSTRAINT `FK_4a5bcb3b5e5a0a7fc455c8403d4` FOREIGN KEY (`avatarId`) REFERENCES `avatars` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_a5ec6c073b7750974ac12bec722` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_microphones`
--

DROP TABLE IF EXISTS `user_microphones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_microphones` (
  `id` varchar(36) NOT NULL,
  `acquiredAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `userId` varchar(255) NOT NULL,
  `microphoneId` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_ee42573aa4979186d4d18db9475` (`userId`),
  KEY `FK_d94ec577b3b053f5fc156c4a947` (`microphoneId`),
  CONSTRAINT `FK_d94ec577b3b053f5fc156c4a947` FOREIGN KEY (`microphoneId`) REFERENCES `microphones` (`id`),
  CONSTRAINT `FK_ee42573aa4979186d4d18db9475` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-20 13:16:51
