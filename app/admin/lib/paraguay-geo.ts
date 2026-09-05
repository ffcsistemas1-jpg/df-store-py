// Departamentos y distritos oficiales del Paraguay.
// Fuente: CONACYT, "Distritos del Paraguay" (Dirección de Estadística, Encuestas y Censos).
// Se usa para el combo en cascada Departamento → Ciudad/Distrito en "Envío al interior".
// Nota: no existe un listado oficial y homogéneo de barrios para los ~220 distritos del país,
// por eso el campo Barrio para envíos al interior queda como texto libre.

export const PARAGUAY_DEPARTAMENTOS: { name: string; distritos: string[] }[] = [
  { name: "Asunción", distritos: ["Asunción"] },
  { name: "Concepción", distritos: ["Concepción","Belén","Horqueta","Loreto","San Carlos","San Lázaro","Yvy Ya'ú","Azotey","Sgto. José Félix López","San Alfredo","Paso Barreto"] },
  { name: "San Pedro", distritos: ["San Pedro del Ykuamandiyú","Antequera","Choré","General Elizardo Aquino","Itacurubí del Rosario","Lima","Nueva Germania","San Estanislao","San Pablo","Tacuatí","Unión","25 de Diciembre","Villa del Rosario","General Resquín","Yataity del Norte","Guajayvi","Capiibary","Santa Rosa del Aguaray","Yryvu Cuá","Liberación"] },
  { name: "Cordillera", distritos: ["Caacupé","Altos","Arroyos y Esteros","Atyrá","Caraguatay","Emboscada","Eusebio Ayala","Isla Pucú","Itacurubí de la Cordillera","Juan de Mena","Loma Grande","Mbocayaty del Yhaguy","Nueva Colombia","Piribebuy","Primero de Marzo","San Bernardino","Santa Elena","Tobatí","Valenzuela","San José Obrero"] },
  { name: "Guairá", distritos: ["Villarrica","Borja","Mauricio José Troche","Coronel Martínez","Félix Pérez Cardozo","General Eugenio A. Garay","Independencia","Itapé","Iturbe","José Fassardi","Mbocayaty","Natalicio Talavera","Ñumí","San Salvador","Yataity","Dr. Bottrell","Paso Yobái","Tebicuary"] },
  { name: "Caaguazú", distritos: ["Coronel Oviedo","Caaguazú","Carayaó","Cecilio Báez","Santa Rosa del Mbutuy","Dr. Juan Manuel Frutos","Repatriación","Nueva Londres","San Joaquín","San José de los Arroyos","Yhú","J. Eulogio Estigarribia","R.I. 3 Corrales","Raúl Arsenio Oviedo","José Domingo Ocampos","Mcal. Francisco Solano López","La Pastora","3 de Febrero","Simón Bolívar","Vaquería","Tembiaporã","Nueva Toledo"] },
  { name: "Caazapá", distritos: ["Caazapá","Abaí","Buena Vista","Moisés Bertoni","General Higinio Morínigo","Maciel","San Juan Nepomuceno","Tavaí","Fulgencio Yegros","Yuty","3 de Mayo"] },
  { name: "Itapúa", distritos: ["Encarnación","Bella Vista","Cambyretá","Capitán Meza","Capitán Miranda","Nueva Alborada","Carmen del Paraná","Coronel Bogado","Carlos Antonio López","Natalio","Fram","General Artigas","General Delgado","Hohenau","Jesús","Leandro Oviedo","Obligado","Mayor Otaño","San Cosme y Damián","San Pedro del Paraná","San Rafael del Paraná","Trinidad","Edelira","Tomás Romero Pereira","Alto Verá","La Paz","Yatytay","San Juan del Paraná","Pirapó","Itapúa Poty"] },
  { name: "Misiones", distritos: ["San Juan Bautista","Ayolas","San Ignacio","San Miguel","San Patricio","Santa María","Santa Rosa","Santiago","Villa Florida","Yabebyry"] },
  { name: "Paraguarí", distritos: ["Paraguarí","Acahay","Caapucú","General Bernardino Caballero","Carapeguá","Escobar","La Colmena","Mbuyapey","Pirayú","Quiindy","Quyquyhó","San Roque González","Sapucái","Tebicuary-mí","Yaguarón","Ybycuí","Yvytymí"] },
  { name: "Alto Paraná", distritos: ["Ciudad del Este","Presidente Franco","Domingo Martínez de Irala","Dr. Juan León Mallorquín","Hernandarias","Itakyry","Juan E. O'Leary","Ñacunday","Yguazú","Los Cedrales","Minga Guazú","San Cristóbal","Santa Rita","Naranjal","Santa Rosa del Monday","Minga Porã","Mbaracayú","San Alberto","Iruña","Santa Fe del Paraná","Tavapy","Dr. Raúl Peña"] },
  { name: "Central", distritos: ["Areguá","Capiatá","Fernando de la Mora","Guarambaré","Itá","Itauguá","Lambaré","Limpio","Luque","Mariano Roque Alonso","Nueva Italia","Ñemby","San Antonio","San Lorenzo","Villa Elisa","Villeta","Ypacaraí","Ypané","J. Augusto Saldívar"] },
  { name: "Ñeembucú", distritos: ["Pilar","Alberdi","Cerrito","Desmochados","General Díaz","Guazú Cuá","Humaitá","Isla Umbú","Los Laureles","Mayor Martínez","Paso de Patria","San Juan Bautista de Ñeembucú","Tacuaras","Villa Franca","Villa Oliva","Villalbín"] },
  { name: "Amambay", distritos: ["Pedro Juan Caballero","Bella Vista","Capitán Bado","Zanja Pytã","Karapaí"] },
  { name: "Canindeyú", distritos: ["Saltos del Guairá","Corpus Christi","Curuguaty","Villa Ygatimí","Itanará","Ype Jhú","Francisco Caballero Álvarez","Katueté","La Paloma","Nueva Esperanza","Yasy Cañy","Ybyrarobaná","Yby Pytã"] },
  { name: "Presidente Hayes", distritos: ["Benjamín Aceval","Puerto Pinasco","Villa Hayes","Nanawa","José Falcón","Tte. 1ro. Manuel Irala Fernández","Tte. Esteban Martínez","Gral. José María Bruguez"] },
  { name: "Boquerón", distritos: ["Mariscal Estigarribia","Filadelfia","Loma Plata"] },
  { name: "Alto Paraguay", distritos: ["Fuerte Olimpo","Puerto Casado","Bahía Negra","Carmelo Peralta"] },
];
