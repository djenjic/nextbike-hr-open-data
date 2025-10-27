--
-- PostgreSQL database dump
--

\restrict xHtZXvcg0hTaLd9vibq2S4JcM8X4bFYhwDUggig6AxKroW6hV9IpHkHQbhd2Nt0

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bicikli; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bicikli (
    id integer NOT NULL,
    status character varying(50),
    tip character varying(50),
    zadnje_koristenje date,
    stanica_id integer
);


ALTER TABLE public.bicikli OWNER TO postgres;

--
-- Name: stanice; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stanice (
    id integer NOT NULL,
    naziv character varying(100) NOT NULL,
    adresa character varying(255),
    kapacitet integer,
    geo_lat double precision,
    geo_lon double precision,
    aktivna boolean,
    datum_posljednje_aktivnosti date
);


ALTER TABLE public.stanice OWNER TO postgres;

--
-- Data for Name: bicikli; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bicikli (id, status, tip, zadnje_koristenje, stanica_id) FROM stdin;
800485	dostupan	Bicikl s djecjom sjedalicom	2025-10-25	21269
800432	iznajmljen	Smartbike 2.0 armiert	2025-10-24	21269
800324	servis	Smartbike 2.0 armiert	2025-10-22	21269
800312	dostupan	Smartbike 2.0 armiert	2025-10-25	21269
800264	dostupan	Smartbike 2.0 armiert	2025-10-25	21269
800252	iznajmljen	Smartbike 2.0 armiert	2025-10-24	21269
800187	dostupan	Smartbike 2.0 armiert	2025-10-25	21269
\.


--
-- Data for Name: stanice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stanice (id, naziv, adresa, kapacitet, geo_lat, geo_lon, aktivna, datum_posljednje_aktivnosti) FROM stdin;
21269	TC Savica	Lastovska ulica 2A	10	45.794	15.977	t	2025-10-26
21313	Lastovska ulica	Lastovska ulica 38	10	45.791	15.999	t	2025-10-26
21268	SC Trnje	Ulica grada Vukovara 236D	10	45.798	15.993	t	2025-10-26
21267	Kruge	Kruge 5	10	45.798	15.987	t	2025-10-26
21282	Ulica grada Chicaga	Ulica grada Chicaga	10	45.786	16.006	t	2025-10-26
21237	Arena Zagreb	Ulica Vice Vukova 6	16	45.77	15.935	t	2025-10-19
21316	Ulica Milke Trnina	Ulica Milke Trnina 11a	10	45.793	16.005	t	2025-10-26
21207	Autobusni kolodvor	Trg Luke Botica 1	16	45.804	15.994	t	2025-10-26
21220	Green gold	Radnicka cesta 50	20	45.803	16.002	t	2025-10-26
21235	Nacionalna i sveucilisna knjiznica	Ulica Hrvatske bratske zajednice 4	20	45.797	15.978	t	2025-10-26
\.


--
-- Name: bicikli bicikli_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bicikli
    ADD CONSTRAINT bicikli_pkey PRIMARY KEY (id);


--
-- Name: stanice stanice_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stanice
    ADD CONSTRAINT stanice_pkey PRIMARY KEY (id);


--
-- Name: bicikli bicikli_stanica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bicikli
    ADD CONSTRAINT bicikli_stanica_id_fkey FOREIGN KEY (stanica_id) REFERENCES public.stanice(id);


--
-- PostgreSQL database dump complete
--

\unrestrict xHtZXvcg0hTaLd9vibq2S4JcM8X4bFYhwDUggig6AxKroW6hV9IpHkHQbhd2Nt0

