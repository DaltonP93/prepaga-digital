--
-- PostgreSQL database dump
--

\restrict adfNlXjDpFo9DOCZUB4euwsiQkxFhRlC811hzuvXwEkqM6OhjC1cDisP8Eu4HyC

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'a69ba230-47d2-45a8-ad39-9823d8ec5c53', 'authenticated', 'authenticated', 'eder.arguello@samap.com.py', '$2a$10$Mts/OYV5BuCysbOEX5HLSuBA5LVFETyqUORMUzUoPhD6DFLrWb.nC', '2026-03-10 20:06:36.293222+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"role": "admin", "last_name": "Arguello", "first_name": "eder", "email_verified": true}', NULL, '2026-03-10 20:06:36.238787+00', '2026-03-10 20:11:17.955468+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '27929db1-59a1-4632-98e7-ac94eb865893', 'authenticated', 'authenticated', 'vendedor@saap.com.py', '$2a$10$S/PrPywcDUsN/LrDUKqYGeALWVqeLuZgMploMotEQDhDx7o8BYGzS', '2026-02-16 14:34:22.695671+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-02-16 15:13:59.175447+00', '{"provider": "email", "providers": ["email"]}', '{"role": "vendedor", "last_name": "vendedor", "first_name": "vendedor", "email_verified": true}', NULL, '2026-02-16 14:34:22.633327+00', '2026-02-16 16:35:06.279939+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '126885ee-5a81-4d89-ac40-eca263df9e42', 'authenticated', 'authenticated', 'admin.samap@hotmail.com', '$2a$10$9Qs9wwnePtR0ZRHw/Ijqju4VFoGOnVRj4iMfI4tmrM8Znha05g6si', '2026-03-10 12:58:55.221109+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-10 19:35:50.563057+00', '{"provider": "email", "providers": ["email"]}', '{"role": "admin", "last_name": "admin", "first_name": "admin", "email_verified": true}', NULL, '2026-03-10 12:58:55.155745+00', '2026-03-10 20:34:16.440491+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'a91bd9e9-3965-4836-9a19-575baec01dcf', 'authenticated', 'authenticated', 'dalton9302@gmail.com', '$2a$10$jjHlw9FQfapVSioBpY5EZe0cII.Ps2hsdSsNokMgfiPg54bz42mJC', '2026-02-03 02:41:40.572764+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-20 15:17:53.250025+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-03 02:41:40.54621+00', '2026-03-24 15:53:26.271993+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '1ba74f40-310a-41c2-b144-d3a8f4ed9110', 'authenticated', 'authenticated', 'sistemas@saa.com.py', '$2a$10$0eoTDySMPkU6r5/QuPHNQe8QMBbBZG5VWC4HGFaS0NPrgXdhaP2s6', '2026-02-10 21:54:26.268506+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-18 16:48:38.744268+00', '{"provider": "email", "providers": ["email"]}', '{"role": "vendedor", "last_name": "samap", "first_name": "vendedor", "email_verified": true}', NULL, '2026-02-10 21:54:25.915775+00', '2026-03-19 19:17:15.487633+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'bd0d7872-c1c8-43af-ab58-d839f3192c24', 'authenticated', 'authenticated', 'dalton.perez@saa.com.py', '$2a$10$dTL5y6b7Tz6PjA3mSf1tC.0N2CsyX2F0/kFcKzUoVgQLf9/EaZj5W', '2026-02-09 18:36:24.380518+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-10 19:02:10.666642+00', '{"provider": "email", "providers": ["email"]}', '{"role": "gestor", "last_name": "samap", "first_name": "auditor", "email_verified": true}', NULL, '2026-02-09 18:36:24.345039+00', '2026-03-10 19:02:10.680552+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'a76c7352-0b1b-4db6-9b4a-f1659f4aeee5', 'authenticated', 'authenticated', 'cacosta.ma@gmail.com', '$2a$06$Pu6rxGy9vFhZUgoruv2teu/jRfxyrO4.Q9/sxLTjH6dzHwtguLHPC', '2026-02-09 21:35:58.865335+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-23 18:40:27.187204+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-09 21:35:58.836537+00', '2026-03-24 16:17:50.231245+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO auth.identities VALUES ('a91bd9e9-3965-4836-9a19-575baec01dcf', 'a91bd9e9-3965-4836-9a19-575baec01dcf', '{"sub": "a91bd9e9-3965-4836-9a19-575baec01dcf", "email": "dalton9302@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-03 02:41:40.564224+00', '2026-02-03 02:41:40.564286+00', '2026-02-03 02:41:40.564286+00', DEFAULT, '0a9f05f4-ae5a-484d-8876-d9c8d9d32e06');
INSERT INTO auth.identities VALUES ('bd0d7872-c1c8-43af-ab58-d839f3192c24', 'bd0d7872-c1c8-43af-ab58-d839f3192c24', '{"sub": "bd0d7872-c1c8-43af-ab58-d839f3192c24", "email": "dalton.perez@saa.com.py", "email_verified": false, "phone_verified": false}', 'email', '2026-02-09 18:36:24.376743+00', '2026-02-09 18:36:24.376802+00', '2026-02-09 18:36:24.376802+00', DEFAULT, '8e4b2521-1b95-4581-ad1d-1092ac0c6a3c');
INSERT INTO auth.identities VALUES ('a76c7352-0b1b-4db6-9b4a-f1659f4aeee5', 'a76c7352-0b1b-4db6-9b4a-f1659f4aeee5', '{"sub": "a76c7352-0b1b-4db6-9b4a-f1659f4aeee5", "email": "cacosta.ma@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-09 21:35:58.859511+00', '2026-02-09 21:35:58.859579+00', '2026-02-09 21:35:58.859579+00', DEFAULT, 'ea2257e9-9198-49ab-9635-6f9a68fc61a2');
INSERT INTO auth.identities VALUES ('1ba74f40-310a-41c2-b144-d3a8f4ed9110', '1ba74f40-310a-41c2-b144-d3a8f4ed9110', '{"sub": "1ba74f40-310a-41c2-b144-d3a8f4ed9110", "email": "sistemas@saa.com.py", "email_verified": false, "phone_verified": false}', 'email', '2026-02-10 21:54:26.252621+00', '2026-02-10 21:54:26.252683+00', '2026-02-10 21:54:26.252683+00', DEFAULT, 'bd8a07b6-117f-44c2-bed9-b2d9d4e00d4e');
INSERT INTO auth.identities VALUES ('27929db1-59a1-4632-98e7-ac94eb865893', '27929db1-59a1-4632-98e7-ac94eb865893', '{"sub": "27929db1-59a1-4632-98e7-ac94eb865893", "email": "vendedor@saap.com.py", "email_verified": false, "phone_verified": false}', 'email', '2026-02-16 14:34:22.678829+00', '2026-02-16 14:34:22.679577+00', '2026-02-16 14:34:22.679577+00', DEFAULT, 'ddd80aac-b0c1-45cb-8c17-62d8dcb8ed1e');
INSERT INTO auth.identities VALUES ('126885ee-5a81-4d89-ac40-eca263df9e42', '126885ee-5a81-4d89-ac40-eca263df9e42', '{"sub": "126885ee-5a81-4d89-ac40-eca263df9e42", "email": "admin.samap@hotmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-10 12:58:55.202514+00', '2026-03-10 12:58:55.203291+00', '2026-03-10 12:58:55.203291+00', DEFAULT, '0b2d4e46-42c5-4ee7-a9cd-9a72c378e2fe');
INSERT INTO auth.identities VALUES ('a69ba230-47d2-45a8-ad39-9823d8ec5c53', 'a69ba230-47d2-45a8-ad39-9823d8ec5c53', '{"sub": "a69ba230-47d2-45a8-ad39-9823d8ec5c53", "email": "eder.arguello@samap.com.py", "email_verified": false, "phone_verified": false}', 'email', '2026-03-10 20:06:36.272565+00', '2026-03-10 20:06:36.273269+00', '2026-03-10 20:06:36.273269+00', DEFAULT, '13ca59a0-7b24-4c3b-acd2-42b2e3443b6d');


--
-- PostgreSQL database dump complete
--

\unrestrict adfNlXjDpFo9DOCZUB4euwsiQkxFhRlC811hzuvXwEkqM6OhjC1cDisP8Eu4HyC

