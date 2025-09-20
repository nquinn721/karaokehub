-- Avatar & Store Data Export
-- Generated: 2025-09-20T21:46:08.089Z
-- Tables: avatars, microphones, coin_packages
-- Source: karaoke-hub@localhost
--
-- Import to Cloud SQL:
-- gcloud sql import sql [INSTANCE_NAME] gs://[BUCKET_NAME]/avatar-store-data-2025-09-20.sql
--
-- Or via mysql client:
-- mysql -h [CLOUD_SQL_IP] -u [USER] -p [DATABASE] < avatar-store-data-2025-09-20.sql

-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: karaoke-hub
-- ------------------------------------------------------
-- Server version	8.0.42
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
-- Dumping data for table `avatars`
--

INSERT INTO `avatars` (`id`, `name`, `description`, `type`, `rarity`, `imageUrl`, `price`, `coinPrice`, `isAvailable`, `createdAt`, `updatedAt`, `isFree`) VALUES ('alex','Alex','A friendly and versatile performer with a warm personality','basic','common','/images/avatar/avatars/alex.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1);
INSERT INTO `avatars` (`id`, `name`, `description`, `type`, `rarity`, `imageUrl`, `price`, `coinPrice`, `isAvailable`, `createdAt`, `updatedAt`, `isFree`) VALUES ('blake','Blake','A confident artist with modern style and great stage presence','basic','common','/images/avatar/avatars/blake.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1);
INSERT INTO `avatars` (`id`, `name`, `description`, `type`, `rarity`, `imageUrl`, `price`, `coinPrice`, `isAvailable`, `createdAt`, `updatedAt`, `isFree`) VALUES ('cameron','Cameron','A dynamic performer with classic appeal and natural charisma','basic','common','/images/avatar/avatars/cameron.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1);
INSERT INTO `avatars` (`id`, `name`, `description`, `type`, `rarity`, `imageUrl`, `price`, `coinPrice`, `isAvailable`, `createdAt`, `updatedAt`, `isFree`) VALUES ('joe','Joe','A reliable and steady performer with authentic charm','basic','common','/images/avatar/avatars/joe.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1);
INSERT INTO `avatars` (`id`, `name`, `description`, `type`, `rarity`, `imageUrl`, `price`, `coinPrice`, `isAvailable`, `createdAt`, `updatedAt`, `isFree`) VALUES ('juan','Juan','A passionate singer with vibrant energy and cultural flair','basic','common','/images/avatar/avatars/juan.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1);
INSERT INTO `avatars` (`id`, `name`, `description`, `type`, `rarity`, `imageUrl`, `price`, `coinPrice`, `isAvailable`, `createdAt`, `updatedAt`, `isFree`) VALUES ('kai','Kai','A creative artist with unique style and artistic vision','basic','common','/images/avatar/avatars/kai.png',0.00,0,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',1);
INSERT INTO `avatars` (`id`, `name`, `description`, `type`, `rarity`, `imageUrl`, `price`, `coinPrice`, `isAvailable`, `createdAt`, `updatedAt`, `isFree`) VALUES ('onyx','Onyx','A bold performer with striking features and commanding presence','premium','uncommon','/images/avatar/avatars/onyx.png',5.00,100,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',0);
INSERT INTO `avatars` (`id`, `name`, `description`, `type`, `rarity`, `imageUrl`, `price`, `coinPrice`, `isAvailable`, `createdAt`, `updatedAt`, `isFree`) VALUES ('tyler','Tyler','A versatile entertainer with contemporary appeal and smooth vocals','premium','uncommon','/images/avatar/avatars/tyler.png',5.00,100,1,'2025-09-20 11:29:02.485953','2025-09-20 11:29:02.485953',0);

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
-- Dumping data for table `microphones`
--

INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_basic_1','Basic Mic Silver','basic','common','/images/avatar/parts/microphones/mic_basic_1.png',1,'2025-09-19 12:48:29.465393','2025-09-19 16:20:08.705885',0.00,0,NULL,'A reliable silver microphone for beginners',0,1);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_basic_2','Basic Mic Black','basic','common','/images/avatar/parts/microphones/mic_basic_2.png',1,'2025-09-19 12:48:29.465393','2025-09-19 16:20:08.705885',0.00,0,NULL,'A sleek black microphone with good sound quality',0,1);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_basic_3','Basic Mic Blue','basic','common','/images/avatar/parts/microphones/mic_basic_3.png',1,'2025-09-19 12:48:29.465393','2025-09-19 16:20:08.705885',0.00,0,NULL,'A vibrant blue microphone for those who like color',0,1);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_basic_4','Basic Mic Red','basic','common','/images/avatar/parts/microphones/mic_basic_4.png',1,'2025-09-19 12:48:29.465393','2025-09-19 16:20:08.705885',0.00,0,NULL,'A bold red microphone that stands out',0,1);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_diamond_1','Diamond Dynasty','premium','legendary','/images/avatar/parts/microphones/mic_diamond_1.png',1,'2025-09-19 15:31:55.676334','2025-09-19 15:31:55.676334',0.00,0,NULL,'The ultimate diamond microphone for true karaoke legends',1000,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_diamond_2','Crystal Perfection','premium','legendary','/images/avatar/parts/microphones/mic_diamond_2.png',1,'2025-09-19 15:31:55.676334','2025-09-19 15:31:55.676334',0.00,0,NULL,'Flawless diamond microphone that delivers perfection in every note',1200,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_diamond_3','Brilliant Star','premium','legendary','/images/avatar/parts/microphones/mic_diamond_3.png',1,'2025-09-19 15:31:55.676334','2025-09-19 15:31:55.676334',0.00,0,NULL,'A brilliant diamond microphone that outshines all others',1500,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_diamond_4','Diamond Deity','premium','legendary','/images/avatar/parts/microphones/mic_diamond_4.png',1,'2025-09-19 15:31:55.676334','2025-09-19 15:31:55.676334',0.00,0,NULL,'The most legendary diamond microphone for karaoke gods',2000,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_emerald_1','Emerald Elite','premium','rare','/images/avatar/parts/microphones/mic_emerald_1.png',1,'2025-09-19 15:31:55.670474','2025-09-19 15:31:55.670474',0.00,0,NULL,'An elegant emerald microphone for distinguished performers',250,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_emerald_2','Forest Green Pro','premium','rare','/images/avatar/parts/microphones/mic_emerald_2.png',1,'2025-09-19 15:31:55.670474','2025-09-19 15:31:55.670474',0.00,0,NULL,'Nature-inspired emerald microphone with crystal-clear sound',300,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_emerald_3','Jade Jewel','premium','rare','/images/avatar/parts/microphones/mic_emerald_3.png',1,'2025-09-19 15:31:55.670474','2025-09-19 15:31:55.670474',0.00,0,NULL,'A precious emerald microphone with exceptional clarity',350,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_emerald_4','Emerald Crown','premium','rare','/images/avatar/parts/microphones/mic_emerald_4.png',1,'2025-09-19 15:31:55.670474','2025-09-19 15:31:55.670474',0.00,0,NULL,'Royal emerald microphone fit for a karaoke king',400,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_gold_1','Golden Classic','golden','uncommon','/images/avatar/parts/microphones/mic_gold_1.png',1,'2025-09-19 15:31:55.664349','2025-09-19 15:31:55.664349',0.00,0,NULL,'A classic golden microphone with warm, rich tones',100,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_gold_2','Gold Performer','golden','uncommon','/images/avatar/parts/microphones/mic_gold_2.png',1,'2025-09-19 15:31:55.664349','2025-09-19 15:31:55.664349',0.00,0,NULL,'Professional golden microphone for serious performers',120,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_gold_3','Golden Star','golden','uncommon','/images/avatar/parts/microphones/mic_gold_3.png',1,'2025-09-19 15:31:55.664349','2025-09-19 15:31:55.664349',0.00,0,NULL,'Luxurious golden microphone that makes you shine',150,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_gold_4','Gold Standard','golden','uncommon','/images/avatar/parts/microphones/mic_gold_4.png',1,'2025-09-19 15:31:55.664349','2025-09-19 15:31:55.664349',0.00,0,NULL,'The gold standard in microphone excellence',180,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_ruby_1','Ruby Radiance','premium','epic','/images/avatar/parts/microphones/mic_ruby_1.png',1,'2025-09-19 15:31:55.671888','2025-09-19 15:31:55.671888',0.00,0,NULL,'A stunning ruby microphone that commands attention on stage',500,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_ruby_2','Crimson Crown','premium','epic','/images/avatar/parts/microphones/mic_ruby_2.png',1,'2025-09-19 15:31:55.671888','2025-09-19 15:31:55.671888',0.00,0,NULL,'Royal ruby microphone with unmatched performance and style',600,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_ruby_3','Scarlet Supreme','premium','epic','/images/avatar/parts/microphones/mic_ruby_3.png',1,'2025-09-19 15:31:55.671888','2025-09-19 15:31:55.671888',0.00,0,NULL,'Supreme ruby microphone for passionate performers',700,0);
INSERT INTO `microphones` (`id`, `name`, `type`, `rarity`, `imageUrl`, `isAvailable`, `createdAt`, `updatedAt`, `price`, `isUnlockable`, `unlockRequirement`, `description`, `coinPrice`, `isFree`) VALUES ('mic_ruby_4','Ruby Royalty','premium','epic','/images/avatar/parts/microphones/mic_ruby_4.png',1,'2025-09-19 15:31:55.671888','2025-09-19 15:31:55.671888',0.00,0,NULL,'The most regal ruby microphone in existence',800,0);

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
-- Dumping data for table `coin_packages`
--

INSERT INTO `coin_packages` (`id`, `name`, `coinAmount`, `priceUSD`, `bonusCoins`, `isActive`, `sortOrder`, `description`, `createdAt`, `updatedAt`) VALUES ('550e8400-e29b-41d4-a716-446655440010','Starter Pack',100,0.99,0,1,1,'','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319');
INSERT INTO `coin_packages` (`id`, `name`, `coinAmount`, `priceUSD`, `bonusCoins`, `isActive`, `sortOrder`, `description`, `createdAt`, `updatedAt`) VALUES ('550e8400-e29b-41d4-a716-446655440011','Small Pack',250,1.99,25,1,2,'','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319');
INSERT INTO `coin_packages` (`id`, `name`, `coinAmount`, `priceUSD`, `bonusCoins`, `isActive`, `sortOrder`, `description`, `createdAt`, `updatedAt`) VALUES ('550e8400-e29b-41d4-a716-446655440012','Medium Pack',600,4.99,100,1,3,'','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319');
INSERT INTO `coin_packages` (`id`, `name`, `coinAmount`, `priceUSD`, `bonusCoins`, `isActive`, `sortOrder`, `description`, `createdAt`, `updatedAt`) VALUES ('550e8400-e29b-41d4-a716-446655440013','Large Pack',1300,9.99,300,1,4,'','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319');
INSERT INTO `coin_packages` (`id`, `name`, `coinAmount`, `priceUSD`, `bonusCoins`, `isActive`, `sortOrder`, `description`, `createdAt`, `updatedAt`) VALUES ('550e8400-e29b-41d4-a716-446655440014','Mega Pack',2800,19.99,700,1,5,'','2025-09-19 15:41:12.498227','2025-09-19 15:41:12.514319');
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-20 17:46:08
